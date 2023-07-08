/*
 * @module api/recharge/recharge-reactivate-subscription.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import subscriptionReactivatedMail from "../../mail/subscription-reactivated.js";
import { makeRechargeQuery, updateSubscription,  updateChargeDate } from "../../lib/recharge/helpers.js";
import { sortObjectByKeys } from "../../lib/helpers.js";

/*
 * @function recharge/recharge-reactivate-subscription.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
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

  const nextchargedate = req.body.nextchargedate;
  const nextdeliverydate = req.body.nextdeliverydate;

  const { box: boxStr, includes: includesStr } = req.body;

  const includes = JSON.parse(includesStr); // note that here includes are subscription objects
  const box = JSON.parse(boxStr); // the parent subscription

  const { product_title: title, properties: propertyList, customer_id, address_id, id: subscription_id } = box;
  const properties = propertyList.reduce(
    (acc, curr) => Object.assign(acc, { [`${curr.name}`]: curr.value === null ? "" : curr.value }),
    {});

  /*
  console.log("INCLUDES",includes);
  console.log(box);
  console.log(properties);
  */

  // add updated flag to rec_subscription_ids
  // rc_subscription_ids should have everything in includes
  const subscription_ids = includes.map(el => {
    return { 
      subscription_id: el.id,
      shopify_product_id: el.external_product_id.ecommerce,
      quantity: el.quantity,
      updated: false
    };
  });

  // set dates
  let chargeDate = new Date(Date.parse(nextchargedate));
  const offset = chargeDate.getTimezoneOffset()
  chargeDate = new Date(chargeDate.getTime() - (offset*60*1000))
  const nextChargeDate = chargeDate.toISOString().split('T')[0];

  const doc= {
    charge_id: null,
    customer_id,
    address_id,
    subscription_id,
    scheduled_at: nextChargeDate,
    rc_subscription_ids: subscription_ids,
    title,
    timestamp: new Date(),
  };
  delete properties.Likes;
  delete properties.Dislikes;

  // not sure why we have a string here
  properties.box_subscription_id = parseInt(properties.box_subscription_id);

  return res.status(200).json({
      success: true,
      action: "reactivated",
      subscription_id: box.id,
      address_id,
      customer_id,
      scheduled_at: nextChargeDate,
    });

  for (const [key, value] of Object.entries(properties)) {
    doc[key] = value;
  };
  const result = await _mongodb.collection("updates_pending").updateOne(
    { subscription_id },
    { "$set" : doc },
    { "upsert": true }
  );

  const topicLower = "subscription/reactivated";
  const meta = {
    recharge: {
      topic: topicLower,
      charge_id: null,
      customer_id: customer_id,
      address_id,
      subscription_id,
      next_delivery: nextdeliverydate,
      next_charge_date: nextchargedate,
      rc_subscription_ids: subscription_ids,
    }
  };
  for (const [key, value] of Object.entries(properties)) {
    meta.recharge[key] = value;
  };

  meta.recharge = sortObjectByKeys(meta.recharge);
  _logger.notice(`Recharge customer api request ${topicLower}.`, { meta });

  const child_props = {
    "Delivery Date": nextdeliverydate,
    "Add on product to": title,
    "box_subscription_id": subscription_id
  };
  const child_properties = Object.entries(child_props).map(([name, value]) => {
    return { name: value };
  });
  const parent_props = { ...properties,
    "Delivery Date": nextdeliverydate,
  };
  const parent_properties = Object.entries(parent_props).map(([name, value]) => {
    return { name, value };
  });

  const updates = [];
  // box subscription is not included in the includes
  for (const subscription of [ ...includes, box ]) {
    const props = (subscription.id === subscription_id) ? parent_properties : child_properties;
    updates.push({
      id: subscription.id,
      title: subscription.product_title,
      properties: props,
    });
  };

  try {

    // first activated the subscription, curious to see what charge date it gives
    for (const update of updates) {
      await makeRechargeQuery({
        method: "POST",
        path: `subscriptions/${update.id}/activate`,
        title: `Reactivate ${update.title}`
      })
    };

    // then update properties [Delivery Date]
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

    // finally the charge date
    for (const update of updates) {
      const opts = {
        id: update.id,
        title: update.title,
        date: nextChargeDate,
        io,
        session_id,
      };
      // this will update an existing charge with the matching scheduled_at or create a new charge
      await updateChargeDate(opts);
    };

    const mail = {
      subscription_id: box.id,
      box,
      included,
      nextChargeDate: nextchargedate,
      nextDeliveryDate: nextdeliverydate,
    };
    await subscriptionReactivatedMail(mail);

    res.status(200).json({
      success: true,
      action: "reactivated",
      subscription_id: box.id,
      address_id,
      customer_id,
      scheduled_at: nextChargeDate,
    });

  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};


