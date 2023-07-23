/*
 * @module api/recharge/recharge-update.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { updateSubscriptions } from "../../lib/recharge/helpers.js";
import { sortObjectByKeys } from "../../lib/helpers.js";

/*
 * @function recharge/recharge-update.js
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

  const { updates, attributes, properties } = req.body;

  const { title, charge_id, customer, address_id, rc_subscription_ids, subscription_id, scheduled_at } = attributes;
  const label = req.query.label;

  // add updated flag to rec_subscription_ids
  const update_shopify_ids = updates.map(el => el.shopify_product_id);
  let updated;
  const subscription_ids = rc_subscription_ids.map(el => {
    updated = update_shopify_ids.indexOf(el.shopify_product_id) === -1;
    return { ...el, updated };
  });

  // make sure that the box is last
  for(var x in updates) updates[x].properties.some(el => el.name === "Including") ? updates.push( updates.splice(x,1)[0] ) : 0;
  const doc= {
    label: `${label}-PRODUCT-UPDATE`,
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
    { charge_id },
    { "$set" : doc },
    { "upsert": true }
  );

  const topicLower = "charge/update";
  const meta = {
    recharge: {
      topic: topicLower,
      title: `${attributes.title} - ${attributes.variant}`,
      label: `${label}-PRODUCT-UPDATE`,
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

    await updateSubscriptions({ updates, io, session_id });
    const response = { message: "Updates scheduled" };

    // only return items that have been added, i.e. a POST

    res.status(200).json(response);

  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};

