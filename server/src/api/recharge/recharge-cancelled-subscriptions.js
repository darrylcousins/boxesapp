/*
 * @module api/recharge/recharge-cancelled-subscriptions.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { makeRechargeQuery, getLastOrder } from "../../lib/recharge/helpers.js";
import { reconcileGetGrouped } from "../../lib/recharge/reconcile-charge-group.js";
import { getIOSocket } from "./lib.js";

/*
 * Retrieve all cancelled subscriptions for customer
 *
 * @function recharge/recharge-cancelled-subscriptions.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {

  let query;
  let io;
  let session_id;
  let socket;
  const quiet = true;
  if (Object.hasOwn(req.query, "session_id")) {
    req.body.session_id = req.query.session_id;

    socket = getIOSocket(req, quiet);
    io = socket.io;
    session_id = socket.session_id;
  };


  try {

    if (Object.hasOwnProperty.call(req.params, "customer_id")) {
      query = [
        ["customer_id", req.params.customer_id ],
        ["status", "cancelled" ]
      ];
    };

    const { subscriptions } = await makeRechargeQuery({
      path: `subscriptions`,
      query,
      title: "Cancelled subscriptions",
      io,
    });

    if (!subscriptions || !subscriptions.length) {
      // emitting finish to stop loading routine
      if (io) io.emit("finished", { session_id });
      res.status(200).json([]);
      return;
    };

    let address_id;
    for (const el of subscriptions) {
      el.purchase_item_id = el.id; // needed for grouping
      address_id = el.address_id; // doesn't really matter here but is tidier
    };

    const charge = {};
    charge.line_items = subscriptions;
    charge.customer = { id: parseInt(req.params.customer_id) };
    charge.address_id = address_id;
    charge.scheduled_at = null;

    const grouped = await reconcileGetGrouped({ charge, io });

    const result = [];

    for (const [subscription_id, group] of Object.entries(grouped)) {
      // removing charge object which duplicates included
      let lastOrder;
      try {
        const query = {
          customer_id: group.box.customer_id,
          address_id: group.box.address_id,
          product_id: parseInt(group.box.external_product_id.ecommerce),
          subscription_id: parseInt(subscription_id),
        };
        lastOrder = await getLastOrder(query);
      } catch(err) {
        // 404 most likely
        lastOrder = {};
      };

      result.push({
        subscription_id: parseInt(subscription_id),
        box: group.box,
        included: group.included,
        lastOrder
      });
    };

    // emitting finish to stop loading routine
    if (io) io.emit("finished", { session_id });

    res.status(200).json(result);
  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};


