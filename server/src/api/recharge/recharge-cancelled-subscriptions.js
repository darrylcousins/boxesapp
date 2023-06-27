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
  let query;

  if (Object.hasOwnProperty.call(req.params, "customer_id")) {
    query = [
      ["customer_id", req.params.customer_id ],
      ["status", "cancelled" ]
    ];
  } else if (Object.hasOwnProperty.call(req.body, "ids")) {
    query = [
      ["ids", req.body.ids ],
    ];
  };

  try {
    const { subscriptions } = await makeRechargeQuery({
      path: `subscriptions`,
      query,
    });

    if (!subscriptions || !subscriptions.length) {
      // return a result of none
      res.status(200).json([]);
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
      /*
      fs.writeFileSync(`recharge.${subscription_id}.json`, JSON.stringify({
        subscription_id,
        box: group.box,
        included: group.included,
      }, null, 2));
      */
    };

    res.status(200).json(result);
  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};


