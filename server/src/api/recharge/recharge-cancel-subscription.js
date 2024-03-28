/*
 * @module api/recharge/recharge-cancel-subscription.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

//import fs from "fs";
import subscriptionActionMail from "../../mail/subscription-action.js";
import { makeRechargeQuery } from "../../lib/recharge/helpers.js";
import { sortObjectByKeys } from "../../lib/helpers.js";
import { getIOSocket, upsertPending, makeIntervalForFinish } from "./lib.js";

/*
 * @function recharge/recharge-cancel-subscription.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {

  const { io, session_id } = getIOSocket(req);

  const cancellation_reason = req.body.cancellation_reason;

  const properties = JSON.parse(req.body.properties);
  const includes = JSON.parse(req.body.includes);
  const attributes = JSON.parse(req.body.attributes);
  attributes.cancellation_reason = cancellation_reason;
  const { charge_id, now, admin, navigator } = req.body;
  const counter = new Date();

  const { title, customer, address_id, rc_subscription_ids, subscription_id, scheduled_at } = attributes;

  //console.log(attributes);
  //console.log("INCLUDES",includes);
  //console.log(properties);

  // add updated flag to rec_subscription_ids
  // rc_subscription_ids should have everything in includes
  const subscription_ids = rc_subscription_ids.map(el => {
    return { ...el, updated: false };
  });

  // make sure that the box is last
  for(var x in includes) includes[x].properties.some(el => el.name === "Including") ? includes.push( includes.splice(x,1)[0] ) : 0;

  const type = "cancelled";

  const meta = {
    recharge: {
      label: type,
      charge_id,
      customer_id: customer.id,
      address_id,
      subscription_id,
      cancellation_reason,
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
  _logger.notice(`Boxesapp api request subscription ${type}.`, { meta });

  try {

    const entry_id = await upsertPending({
      action: type,
      charge_id: parseInt(charge_id), // the only time charge id is included - this charge will be deleted
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

      const mailOpts = {
        type,
        includes,
        attributes,
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

    res.status(200).json({ success: true, action: "cancelled", subscription_id });

    for (const update of includes) {
      const body = {
        cancellation_reason_comments: "BoxesApp cancel subscription",
        cancellation_reason: cancellation_reason,
      };
      if (update.subscription_id !== subscription_id) body.send_email = false;

      const opts = {
        method: "POST",
        path: `subscriptions/${update.subscription_id}/cancel`,
        body: JSON.stringify(body),
        title: `Cancel ${update.title}`,
        io,
        session_id,
      };

      await makeRechargeQuery(opts);
    };


  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};

