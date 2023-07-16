/*
 * @module api/recharge/recharge-update-charge-date.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import subscriptionUpdatedMail from "../../mail/subscription-updated.js";
import { makeRechargeQuery, updateSubscription,  updateChargeDate } from "../../lib/recharge/helpers.js";
import { sortObjectByKeys } from "../../lib/helpers.js";
import fs from "fs";

/*
 * @function recharge/recharge-update-charge-date.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 *
 * The algorithm here is almost identical to webhooks/charge-created:
 * charge-created: update subscription.properties with box_subscripton_id
 *                 update next_charge_scheduled_at (force 3 days before Delivery Day)
 * update-charge-dated: update subscription.properties with new Delivery Day
 *                      update next_charge_scheduled_at
 */
export default async (req, res, next) => {

  let io;
  let sockets;
  const { session_id } = req.query;

  if (typeof session_id !== "undefined") {
    sockets = req.app.get("sockets");
    console.log("SOCKETS", sockets, session_id);
    if (sockets && Object.hasOwnProperty.call(sockets, session_id)) {
      const socket_id = sockets[session_id];
      io = req.app.get("io").to(socket_id);
      io.emit("uploadProgress", "Received request, processing data...");
    };
  };

  const { nextchargedate, nextdeliverydate, includes: includesStr, attributes: attributesStr, properties: propertiesStr } = req.body;

  const includes = JSON.parse(includesStr);
  const attributes = JSON.parse(attributesStr);
  const properties = JSON.parse(propertiesStr);

  const { title, charge_id, customer, address_id, rc_subscription_ids, subscription_id, scheduled_at } = attributes;

  // add updated flag to rc_subscription_ids
  const update_shopify_ids = includes.map(el => el.shopify_product_id);

  let updated;
  const subscription_ids = rc_subscription_ids.map(el => {
    updated = update_shopify_ids.indexOf(el.shopify_product_id) === -1;
    return { ...el, updated };
  });

  /*
  console.log("Attributes", JSON.stringify(attributes, null, 2));
  console.log("Includes", JSON.stringify(includes, null, 2));
  console.log("Properties", JSON.stringify(properties, null, 2));
  */

  let chargeDate = new Date(Date.parse(nextchargedate));
  // store as ISO date
  const offset = chargeDate.getTimezoneOffset()
  chargeDate = new Date(chargeDate.getTime() - (offset*60*1000))
  const next_scheduled_at = chargeDate.toISOString().split('T')[0];

  const collection = _mongodb.collection("updates_pending");
  const doc= {
    label: "CHARGE_DATE",
    charge_id,
    customer_id: customer.id,
    address_id,
    subscription_id,
    scheduled_at: next_scheduled_at, // this will match the updated subscriptions and charges
    rc_subscription_ids: subscription_ids,
    updated_charge_date: false,
    title,
    timestamp: new Date(),
  };
  delete properties.Likes;
  delete properties.Dislikes;
  for (const [key, value] of Object.entries(properties)) {
    doc[key] = value;
  };
  const result = await collection.updateOne(
    { charge_id: attributes.charge_id },
    { "$set" : doc },
    { "upsert": true }
  );

  // update the properties
  let delivered;
  const updates = includes.map(el => {
    const properties = [ ...el.properties ];
    delivered = properties.find(el => el.name === "Delivery Date");
    delivered.value = nextdeliverydate;
    return { id:el.subscription_id, title: el.title, properties };
  });
  // ensure the box subscription is the first to create a new charge
  for(var x in updates) updates[x].properties.some(el => el.name === "Including") ? updates.unshift(updates.splice(x,1)[0]) : 0;

  const topicLower = "charge/update-charge-date";
  const meta = {
    recharge: {
      label: "CHARGE_DATE",
      topic: topicLower,
      title: `${attributes.title} - ${attributes.variant}`,
      charge_id: attributes.charge_id,
      customer_id: attributes.customer.id,
      shopify_customer_id: attributes.customer.external_customer_id.ecommerce,
      subscription_id: attributes.subscription_id,
      email: attributes.customer.email,
      old_delivery: attributes.nextDeliveryDate,
      new_delivery: nextdeliverydate,
      old_charge_date: attributes.nextChargeDate,
      new_charge_date: nextchargedate,
    }
  };
  for (const [key, value] of Object.entries(properties)) {
    meta.recharge[key] = value;
  };

  meta.recharge = sortObjectByKeys(meta.recharge);
  _logger.notice(`Recharge customer api reqest ${topicLower}.`, { meta });

  try {

    // necessarily has 2 updates to the subscription, must somehow know how
    // many when I get the webhook

    for (const update of updates) {
      const opts = {
        id: update.id,
        title: update.title,
        body: { properties: update.properties },
        io,
        session_id,
      };
      await updateSubscription(opts);
    };

    for (const update of updates) {
      const opts = {
        id: update.id,
        title: update.title,
        date: next_scheduled_at,
        io,
        session_id,
      };
      // this will update an existing charge with the matching scheduled_at or create a new charge
      await updateChargeDate(opts);
    };

    const mail = {
      subscription_id: attributes.subscription_id,
      attributes,
      includes,
      nextChargeDate: nextchargedate,
      nextDeliveryDate: nextdeliverydate,
    };
    await subscriptionUpdatedMail(mail);

    // res.status(200).json({ success: true, nextchargedate: data.nextchargedate, nextdeliverydate: data.nextdeliverydate });
    // This data is passed by form-modal back to initiator using 'listing.reload' event
    res.status(200).json({
      success: true,
      action: "updated",
      subscription_id: attributes.subscription_id,
      scheduled_at: next_scheduled_at,
      nextchargedate,
      nextdeliverydate,
    });

  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};

