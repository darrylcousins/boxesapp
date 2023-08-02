/*
 * @module api/recharge/recharge-cancel-subscription.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

//import fs from "fs";
import subscriptionActionMail from "../../mail/subscription-action.js";
import { makeRechargeQuery } from "../../lib/recharge/helpers.js";
import { sortObjectByKeys } from "../../lib/helpers.js";

/*
 * @function recharge/recharge-cancel-subscription.js
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

  const cancellation_reason = req.body.cancellation_reason;

  const properties = JSON.parse(req.body.properties);
  const includes = JSON.parse(req.body.includes);
  const attributes = JSON.parse(req.body.attributes);

  const { title, charge_id, customer, address_id, rc_subscription_ids, subscription_id, scheduled_at } = attributes;

  //console.log(attributes);
  //console.log("INCLUDES",includes);
  //console.log(properties);

  // add updated flag to rec_subscription_ids
  // rc_subscription_ids should have everything in includes
  const subscription_ids = rc_subscription_ids.map(el => {
    return { ...el, updated: true };
  });

  // make sure that the box is last
  for(var x in includes) includes[x].properties.some(el => el.name === "Including") ? includes.push( includes.splice(x,1)[0] ) : 0;

  const doc= {
    label: "CANCEL",
    charge_id,
    customer_id: customer.id,
    address_id,
    subscription_id,
    scheduled_at,
    rc_subscription_ids: subscription_ids,
    title,
    timestamp: new Date(),
  };
  delete properties.Likes;
  delete properties.Dislikes;
  for (const [key, value] of Object.entries(properties)) {
    doc[key] = value;
  };
  const result = await _mongodb.collection("updates_pending").updateOne(
    { subscription_id },
    { "$set" : doc },
    { "upsert": true }
  );

  const topicLower = "subscription/cancelled";
  const meta = {
    recharge: {
      label: "CANCEL",
      topic: topicLower,
      charge_id,
      customer_id: customer.id,
      address_id,
      subscription_id,
      email: customer.email,
      next_delivery: attributes.nextDeliveryDate,
      next_charge_date: attributes.nextChargeDate,
      rc_subscription_ids: subscription_ids,
    }
  };
  for (const [key, value] of Object.entries(properties)) {
    meta.recharge[key] = value;
  };

  meta.recharge = sortObjectByKeys(meta.recharge);
  _logger.notice(`Recharge customer api request ${topicLower}.`, { meta });

  try {
    for (const update of includes) {
      const body = {
        cancellation_reason_comments: "BoxesApp cancel subscription",
        cancellation_reason: cancellation_reason,
      };
      if (update.subscription_id !== subscription_id) body.send_email = false;
      await makeRechargeQuery({
        method: "POST",
        path: `subscriptions/${update.subscription_id}/cancel`,
        body: JSON.stringify(body),
        title: `Cancel ${update.title}`,
      });
    };

    await subscriptionActionMail({ type: "cancelled", attributes, includes });

    res.status(200).json({ success: true, action: "cancelled", subscription_id });

  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};

