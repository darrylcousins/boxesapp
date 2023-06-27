/*
 * @module api/recharge/recharge-reactivated-subscription.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { makeRechargeQuery } from "../../lib/recharge/helpers.js";
import { gatherData, reconcileChargeGroup, reconcileGetGroups } from "../../lib/recharge/reconcile-charge-group.js";

/*
 * @function recharge/recharge-customer.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 *
 * It takes some time for a charge to be updated after sending reactivation so
 * here I'm faking a charge in order to update portal page after reactivating a
 * cancelled subscription
 */
export default async (req, res, next) => {
  // get recharge customer using shopify customer id
  const grouped = req.body; // subscription_id, box, includes
  try {
    const { customer } = await makeRechargeQuery({
      path: `customers/${grouped.box.customer_id}`,
    });
    const { address } = await makeRechargeQuery({
      path: `addresses/${grouped.box.address_id}`,
    });

    // box and includes are basically subscription objects
    // add in the extra values required to reconcile the group
    grouped.box.images = { small: null };
    grouped.box.title = grouped.box.product_title;
    grouped.box.unit_price = grouped.box.price;
    for (const el of grouped.included) {
      el.images = { small: null };
      el.title = el.product_title;
      el.unit_price = el.price;
    };
    grouped.charge = {
      id: null,
      scheduled_at: grouped.scheduled_at,
      shipping_address: address,
      address_id: address.id,
      customer: customer,
    };

    let result = [];
    result = await gatherData({ grouped: [ grouped ], result });

    res.status(200).json(result[0]);
  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};

