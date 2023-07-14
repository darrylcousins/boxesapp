/*
 * @module api/recharge/recharge-customer-charges.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { makeRechargeQuery, getLastOrder } from "../../lib/recharge/helpers.js";
import { reconcileGetGrouped } from "../../lib/recharge/reconcile-charge-group.js";
import fs from "fs";

/*
 * Retrieve all cancelled subscriptions for customer
 *
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
      title: "Cancelled subscriptions",
    });

    if (!subscriptions || !subscriptions.length) {
      // return a result of none
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

    const grouped = await reconcileGetGrouped({ charge });

    const result = [];

    for (const [subscription_id, group] of Object.entries(grouped)) {
      // removing charge object which duplicates included
      const lastOrder = await getLastOrder({
        customer_id: group.box.customer_id,
        address_id: group.box.address_id,
        product_id: parseInt(group.box.external_product_id.ecommerce),
        subscription_id,
      });

      result.push({
        subscription_id,
        box: group.box,
        included: group.included,
        lastOrder
      });
    };

    res.status(200).json(result);
  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};


