/*
 * @module api/recharge/recharge-update-charge-date.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import subscriptionActionMail from "../../mail/subscription-action.js";
import { makeRechargeQuery, updateSubscription,  updateChargeDate } from "../../lib/recharge/helpers.js";
import { sortObjectByKeys, formatDate, delay } from "../../lib/helpers.js";
import { getIOSocket, upsertPending, makeIntervalForFinish } from "./lib.js";
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

  const { io, session_id } = getIOSocket(req);

  const counter = new Date(); // time the update to finished
  const { nextchargedate, nextdeliverydate, now, navigator, type, admin } = req.body;

  const includes = JSON.parse(req.body.includes);
  const attributes = JSON.parse(req.body.attributes);
  const properties = JSON.parse(req.body.properties);

  const { title, charge_id, customer, address_id, rc_subscription_ids, subscription_id, scheduled_at } = attributes;

  // add updated flag to rc_subscription_ids
  const update_shopify_ids = includes.map(el => el.shopify_product_id);

  let updated;
  const subscription_ids = rc_subscription_ids.map(el => {
    updated = update_shopify_ids.indexOf(el.shopify_product_id) === -1;
    return { ...el, updated };
  });

  let chargeDate = new Date(Date.parse(nextchargedate));
  // store as ISO date
  const next_scheduled_at = formatDate(chargeDate);

  let delivered;
  const updates = includes.map(el => {
    const properties = [ ...el.properties ];
    delivered = properties.find(el => el.name === "Delivery Date");
    delivered.value = nextdeliverydate;
    return { id:el.subscription_id, title: el.title, properties };
  });
  // ensure the box subscription is the first to create a new charge
  for(var x in updates) updates[x].properties.some(el => el.name === "Including") ? updates.unshift(updates.splice(x,1)[0]) : 0;

  const meta = {
    recharge: {
      label: type, // paused or rescheduled
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
  _logger.notice(`Boxesapp api reqest subscription ${type}.`, { meta });

  // update attributes - presented in the email - old/updated
  attributes.previousChargeDate = attributes.nextChargeDate;
  attributes.nextChargeDate = nextchargedate;
  attributes.previousDeliveryDate = attributes.nextDeliveryDate;
  attributes.nextDeliveryDate = nextdeliverydate;

  // return early so as to close the modal and return control to parent component
  // This data is passed by form-modal back to initiator using 'listing.reload' event
  // Can we also find if nextBox is true?
  const boxQuery = {
    delivered: nextdeliverydate,
    shopify_product_id: attributes.product_id,
    active: true };
  const hasNextBox = await _mongodb.collection("boxes").find(boxQuery).toArray();

  if (io) io.emit("message", `Updating ${attributes.title} - ${attributes.variant}`);

  try {

    const entry_id = await upsertPending({
      action: type,
      customer_id: customer.id,
      address_id,
      subscription_id,
      scheduled_at: next_scheduled_at, // this will match the updated subscriptions and charges
      deliver_at: nextdeliverydate,
      rc_subscription_ids: subscription_ids,
      title,
      session_id,
    });

    try {

      const mailOpts = {
        type: type,
        descriptiveType: type,
        attributes,
        includes,
        properties,
        now,
        navigator,
        admin,
      };

      if (io) {
        makeIntervalForFinish({req, io, session_id, entry_id, counter, admin, mailOpts });
      };

    } catch(err) {
      if (io) io.emit("error", `Ooops an error has occurred ... ${ err.message }`);
      throw err;
    };

    res.status(200).json({
      success: true,
      action: "updated",
      hasNextBox: Boolean(hasNextBox.length),
      subscription_id: attributes.subscription_id,
      scheduled_at: next_scheduled_at,
      nextchargedate,
      nextdeliverydate,
    });

    // the order of these matters, doing charge date first gave me odd results
    for (const update of updates) {
      const opts = {
        id: update.id,
        title: `Updating delivery date ${update.title}`,
        body: { properties: update.properties },
        io,
        session_id,
      };
      await updateSubscription(opts);
    };

    await delay(10000); // wait 10 seconds to avoid making call to same route

    for (const update of updates) {
      const opts = {
        id: update.id,
        title: `Updating charge date ${update.title}`,
        date: next_scheduled_at,
        io,
        session_id,
      };
      // this will update an existing charge with the matching scheduled_at or create a new charge
      await updateChargeDate(opts);
    };

    attributes.nextChargeDate = nextchargedate;
    attributes.nextDeliveryDate = nextdeliverydate;
    if (io) io.emit("message", "Updates completed - awaiting creation of new charge");

  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};

