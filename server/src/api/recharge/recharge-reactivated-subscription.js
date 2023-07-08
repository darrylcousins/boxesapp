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
  try {

    res.status(200).json({ message: "updates pending" });
  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};

