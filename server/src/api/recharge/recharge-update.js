/*
 * @module api/recharge/recharge-update.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { updateSubscriptions } from "../../lib/recharge/helpers.js";
import { sortObjectByKeys, formatDate } from "../../lib/helpers.js";
import { getIOSocket, upsertPending, makeIntervalForFinish } from "./lib.js";

/*
 * @function recharge/recharge-update.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {

  const { io, session_id } = getIOSocket(req);

  const counter = new Date(); // time the update to finished
  const { change_messages, updates, attributes, properties, includes, now, navigator, admin } = req.body;

  res.status(200).json({
    message: "Updates scheduled",
    messages: change_messages,
  });

  const { title, charge_id, customer, address_id, rc_subscription_ids, subscription_id, scheduled_at } = attributes;
  // can be 'updated' or 'reconciled' (reconcile when required updates for new box)
  const label = req.query.label;

  // add updated flag to rec_subscription_ids
  const update_shopify_ids = updates.map(el => el.shopify_product_id);
  let updated;
  const subscription_ids = rc_subscription_ids.map(el => {
    updated = update_shopify_ids.indexOf(el.shopify_product_id) === -1;
    return { ...el, updated };
  });

  // because subscription_ids are sound, then run includes through the same
  let rc_el;
  for (const item of includes) {
    rc_el = subscription_ids.find(el => el.shopify_product_id === item.shopify_product_id);
    if (rc_el) {
      item.quantity = rc_el.quantity; // this will correct for zero'd items
    };
  };

  // make sure that the box is last
  for(var x in updates) updates[x].properties.some(el => el.name === "Including") ? updates.push( updates.splice(x,1)[0] ) : 0;

  const scheduled_at_date = new Date(Date.parse(attributes.nextChargeDate));
  const meta = {
    recharge: {
      title: `${attributes.title} - ${attributes.variant}`,
      label,
      charge_id,
      customer_id: customer.id,
      address_id,
      subscription_id,
      email: customer.email,
      next_delivery: attributes.nextDeliveryDate,
      next_charge_date: attributes.nextChargeDate,
      rc_subscription_ids: subscription_ids,
      scheduled_at: formatDate(scheduled_at_date),
      change_messages,
    }
  };
  for (const [key, value] of Object.entries(properties)) {
    meta.recharge[key] = value;
  };

  try {

    const entry_id = await upsertPending({
      action: label, // updated or reconciled
      customer_id: customer.id,
      charge_id,
      address_id,
      subscription_id,
      scheduled_at,
      deliver_at: meta.recharge["Delivery Date"],
      rc_subscription_ids: subscription_ids,
      title,
      session_id,
    });

    try {

      let descriptiveType = "updated the products for"; // default
      if (label === "updated") {
        descriptiveType = "edited and updated the products for";
      } else if (label === "reconciled") {
        descriptiveType = "reconciled the products against the upcoming box for";
      };

      const mailOpts = {
        type: label,
        descriptiveType,
        includes: includes.filter(el => el.quantity > 0), // fixed above
        attributes,
        properties,
        now,
        navigator,
        admin,
        change_messages,
      };

      if (io) {
        makeIntervalForFinish({req, io, session_id, entry_id, counter, admin, mailOpts });
      };

    } catch(err) {
      if (io) io.emit("error", `Ooops an error has occurred ... ${ err.message }`);
      throw err;
    };

    meta.recharge = sortObjectByKeys(meta.recharge);
    _logger.notice(`Boxesapp api request subscription ${label}.`, { meta });

    await updateSubscriptions({ updates, io, session_id });

  } catch(err) {
    if (io) io.emit("error", `Ooops an error has occurred ... ${ err.message }`);
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};

