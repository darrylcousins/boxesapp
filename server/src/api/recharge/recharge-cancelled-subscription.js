/*
 * @module api/recharge/recharge-cancelled-subscription.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { makeRechargeQuery, getLastOrder } from "../../lib/recharge/helpers.js";
import { reconcileGetGrouped } from "../../lib/recharge/reconcile-charge-group.js";
import { sortObjectByKeys, compareArrays } from "../../lib/helpers.js";

/*
 * Retrieve cancelled subscriptions for customer, but trying to find a single group
 * This is to load a single "box subscription" after cancelling
 *
 * @function recharge/recharge-cancelled-subscription.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {

  const ids = req.query.ids
    .split(",")
    .map(el => el.trim())
    .filter(el => el != "")
    .map(el => parseInt(el))
    .sort();

  // the box subscription id
  const subscription_id = parseInt(req.query.subscription_id);

  const query = [
    ["customer_id", req.params.customer_id ],
    ["address_id", req.params.address_id ],
    ["ids", req.query.ids ],
    ["status", "cancelled" ],
  ];

  try {
    const { subscriptions } = await makeRechargeQuery({
      path: `subscriptions`,
      query,
      title: "Cancelled subscriptions",
    });

    if (!subscriptions || !subscriptions.length) {
      // return a result of none
      // use to restart timer
      return res.status(200).json({ message: "not found" });
    };

    for (const el of subscriptions) {
      el.purchase_item_id = el.id // needed for grouping
    };

    const charge = {};
    charge.line_items = subscriptions;
    charge.customer = { id: parseInt(req.params.customer_id) };
    charge.address_id = parseInt(req.params.address_id);
    charge.scheduled_at = null;

    const grouped = await reconcileGetGrouped({ charge });
    const result = grouped[subscription_id];
    delete result.charge; // charge.line_items duplicated in result.includes
    result.subscription_id = subscription_id;

    let lastOrder;
    try {
      const orderQuery = {
        customer_id: result.box.customer_id,
        address_id: result.box.address_id,
        product_id: parseInt(result.box.external_product_id.ecommerce),
        subscription_id,
      };
      lastOrder = await getLastOrder(orderQuery);
    } catch(err) {
      lastOrder = {};
    };
    result.lastOrder = lastOrder;

    return res.status(200).json(result);

  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};



