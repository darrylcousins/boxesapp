/*
 * @module api/recharge/recharge-customer-charges.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { ObjectID } from "mongodb";
import { makeRechargeQuery, getLastOrder } from "../../lib/recharge/helpers.js";
import { reconcileGetGrouped } from "../../lib/recharge/reconcile-charge-group.js";
import { sortObjectByKeys, compareArrays } from "../../lib/helpers.js";

/*
 * Retrieve cancelled subscriptions for customer, but trying to find a single group
 * This is to load a single "box subscription" after cancelling
 *
 * @function recharge/recharge-customer-charges.js
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

  // check mongo for updates - the webhook/subscription-cancelled will update
  // all of these, once updated we can remove the updates_pending entry and continue
  const search = {
    //charge_id: parseInt(charge.id), now trying to avoid this because of updating charge and new charges created.
    customer_id: parseInt(req.params.customer_id),
    address_id: parseInt(req.params.address_id),
    subscription_id: parseInt(subscription_id),
  };
  const findPending = await _mongodb.collection("updates_pending").findOne(search);

  let completed = false;
  if (findPending) {
    const pendingIds = findPending.rc_subscription_ids.map(el => el.subscription_id).sort();
    const check = compareArrays(ids, pendingIds);
    const updated = findPending.rc_subscription_ids.every(el => el.updated === true);
    completed = check && updated;
    if (completed) {
      // safely remove the entry
      await _mongodb.collection("updates_pending").deleteOne(search);
    };
  };


  if (!completed) {
    return res.status(200).json({ message: "updates pending" });
  };

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

    result.lastOrder = await getLastOrder({
      customer_id: result.box.customer_id,
      address_id: result.box.address_id,
      product_id: parseInt(result.box.external_product_id.ecommerce),
      subscription_id,
    });

    return res.status(200).json(result);

  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};



