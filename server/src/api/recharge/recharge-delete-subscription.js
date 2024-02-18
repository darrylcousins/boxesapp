/*
 * @module api/recharge/recharge-delete-subscription.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import subscriptionActionMail from "../../mail/subscription-action.js";
import { makeRechargeQuery } from "../../lib/recharge/helpers.js";
import { sortObjectByKeys } from "../../lib/helpers.js";
import { getIOSocket, upsertPending, makeIntervalForFinish } from "./lib.js";

/*
 * @function recharge/recharge-delete-subscription.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {

  const { io, session_id } = getIOSocket(req);

  const box = JSON.parse(req.body.box);
  const includes = JSON.parse(req.body.includes);
  const attributes = JSON.parse(req.body.attributes);
  const { now, admin, navigator } = req.body;
  const counter = new Date();

  const type = "deleted";
  const meta = {
    recharge: {
      label: type,
      charge_id: "cancelled",
      customer_id: box.customer_id,
      address_id: box.address_id,
      subscription_id: box.id,
    }
  };

  try {

    try {

      // missing total_price
      const adjusted = includes.map(el => {
        return {
          ...el,
          total_price: el.price,
          title: el.product_title,
          shopify_product_id: el.external_product_id.ecommerce,
        };
      });
      const totalPrice = includes.map(el => parseFloat(el.price) * el.quantity).reduce((sum, el) => sum + el, 0);
      attributes.totalPrice = `${totalPrice.toFixed(2)}`;

      const mailOpts = {
        type,
        includes: adjusted,
        attributes,
        now,
        navigator,
        admin,
      };

      const entry_id = null; // will complete almost immediately because no entry
      if (io) {
        io.emit("message", `Deleting subscription`);
        makeIntervalForFinish({req, io, session_id, entry_id, counter, admin, mailOpts });
      };

    } catch(err) {
      if (io) io.emit("error", `Ooops an error has occurred ... ${ err.message }`);
      throw err;
    };

    res.status(200).json({ success: true, action: "deleted", subscription_id: box.id });

    for (const id of includes.map(el => `${el.id}`)) {
      const opts = {
        method: "DELETE",
        path: `subscriptions/${id}`,
        body: JSON.stringify({ send_email: false }),
        title: `Delete ${id}`,
        io,
        session_id,
      };
      const result = await makeRechargeQuery(opts);
    };

    meta.recharge = sortObjectByKeys(meta.recharge);
    _logger.notice(`Boxesapp api request subscription ${type}.`, { meta });

    // close session almost immediately
    setTimeout(() => {
      io.emit("completed", "Subscription deleted");
      io.emit("finished", {
        action: "deleted",
        session_id: session_id,
        subscription_id: box.id,
      });
    }, 5000);

  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};

