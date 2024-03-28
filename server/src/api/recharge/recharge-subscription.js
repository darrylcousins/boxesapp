/*
 * @module api/recharge/recharge-subscription.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { makeRechargeQuery } from "../../lib/recharge/helpers.js";
import { gatherVerifiedData } from "../../lib/recharge/verify-customer-subscriptions.js";

/*
 * @function recharge/recharge-subscription.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {
  const subscription_id = req.params.subscription_id;
  try {
    const result = await makeRechargeQuery({
      path: `subscriptions/${subscription_id}`,
      query: [ ["include", "customer,metafields" ] ]
    });

    // but return as a charge.subscriptios object
    // by getting the charge using getVerifiedData
    // the other option being to get each individual subscription

    res.status(200).json(result);
  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};
