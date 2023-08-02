/*
 * @module api/recharge/recharge-reactivate-subscription.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import subscriptionActionMail from "../../mail/subscription-action.js";
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

  const box = JSON.parse(req.body.box);
  const includes = JSON.parse(req.body.includes);
  const attributes = JSON.parse(req.body.attributes);

  const { product_title: title, properties: propertyList, customer_id, address_id, id: subscription_id } = box;
  const properties = propertyList.reduce(
    (acc, curr) => Object.assign(acc, { [`${curr.name}`]: curr.value === null ? "" : curr.value }),
    {});

  // add updated flag to rc_subscription_ids
  // rc_subscription_ids should have everything in includes
  const subscription_ids = includes.map(el => {
    return { 
      subscription_id: el.id,
      shopify_product_id: parseInt(el.external_product_id.ecommerce),
      quantity: el.quantity,
      updated: false
    };
  });
  // add the parent box subscription
  /*
  subscription_ids.push({
    subscription_id: box.id,
    shopify_product_id: parseInt(box.external_product_id.ecommerce),
    quantity: box.quantity,
    updated: false
  });
  */

  // set dates
  let chargeDate = new Date(Date.parse(nextchargedate));
  const offset = chargeDate.getTimezoneOffset()
  chargeDate = new Date(chargeDate.getTime() - (offset*60*1000))
  const nextChargeDate = chargeDate.toISOString().split('T')[0];

  const doc= {
    label: "REACTIVATE",
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
      label: "REACTIVATE",
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

  const child_props = {
    "Delivery Date": nextdeliverydate,
    "Add on product to": title,
    "box_subscription_id": `${subscription_id}` // must be a string
  };
  const child_properties = Object.entries(child_props).map(([name, value]) => {
    return { name, value };
  });
  const parent_props = { ...properties,
    "Delivery Date": nextdeliverydate,
    "box_subscription_id": `${subscription_id}` // must be a string
  };
  const parent_properties = Object.entries(parent_props).map(([name, value]) => {
    return { name, value };
  });

  const updates = [];
  // box subscription is not included in the includes
  // put it at the end initially
  for (const subscription of includes) {
    const props = (subscription.id === subscription_id) ? parent_properties : child_properties;
    updates.push({
      id: subscription.id,
      title: subscription.product_title,
      properties: props,
    });
  };

  try {

    // first activated the subscription, curious to see what charge date it gives, still don't know
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

    // make sure that the box is first for final update
    for(var x in updates) updates[x].properties.some(el => el.name === "Including") ? updates.unshift(updates.splice(x,1)[0]) : 0;

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

    // update for email template
    for (const el of includes) {
      el.title = el.product_title;
      el.shopify_product_id = el.external_product_id.ecommerce;
    };

    const type = "reactivated";
    attributes.nextChargeDate = nextchargedate;
    attributes.nextDeliveryDate = nextdeliverydate;
    const mail = {
      type,
      includes,
      attributes,
    };
    await subscriptionActionMail(mail);

    meta.recharge = sortObjectByKeys(meta.recharge);
    _logger.notice(`Recharge customer api request ${topicLower}.`, { meta });

    res.status(200).json({
      success: true,
      action: type,
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


