/*
 * @module api/recharge/recharge-customer-charges.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { makeRechargeQuery } from "../../lib/recharge/helpers.js";
import { reconcileGetGrouped } from "../../lib/recharge/reconcile-charge-group.js";
import fs from "fs";

/*
 * @function recharge/recharge-customer-charges.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {
  const customer_id = req.params.customer_id;
  try {
    const { subscriptions } = await makeRechargeQuery({
      path: `subscriptions`,
      query: [
        ["customer_id", customer_id ],
        ["status", "cancelled" ]
      ]
    });

    if (!subscriptions || !subscriptions.length) {
      // return a result of none
      res.status(200).json({});
      return;
    };

    for (const el of subscriptions) {
      el.purchase_item_id = el.id // needed for grouping
    };

    const charge = {};
    charge.line_items = subscriptions;

    const grouped = reconcileGetGrouped({ charge });

    const result = [];

    for (const [subscription_id, group] of Object.entries(grouped)) {
      result.push({
        subscription_id,
        box: group.box,
        included: group.included,
      });
    };

    res.status(200).json(result);
  } catch(err) {
    res.status(400).json({ error: err.toString() });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};


