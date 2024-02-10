/*
 * @module api/recharge/recharge-update.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import subscriptionActionMail from "../../mail/subscription-action.js";
import { updateSubscriptions } from "../../lib/recharge/helpers.js";
import { sortObjectByKeys } from "../../lib/helpers.js";
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

  const { title, charge_id, customer, address_id, rc_subscription_ids, subscription_id, scheduled_at } = attributes;
  // can be 'edit' or 'reconcile' (reconcile when required updates for new box)
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

  const topicLower = "charge/update";
  const meta = {
    recharge: {
      topic: topicLower,
      title: `${attributes.title} - ${attributes.variant}`,
      label: `${label.toLowerCase()}`,
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

  try {

    const entry_id = await upsertPending({
      action: "updated", // no need to alter this if reconciling or editing
      customer_id: customer.id,
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
      if (label === "edit") {
        descriptiveType = "edited and updated the products for";
      } else if (label === "reconcile") {
        descriptiveType = "reconciled the products against the upcoming box for";
      };

      const mailOpts = {
        type: "updated",
        descriptiveType,
        includes: includes.filter(el => el.quantity > 0),
        attributes,
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
    _logger.notice(`Recharge customer api request ${topicLower}.`, { meta });

    await updateSubscriptions({ updates, io, session_id });

    res.status(200).json({ message: "Updates scheduled" });

  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};

