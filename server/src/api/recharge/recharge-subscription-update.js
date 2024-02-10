/*
 * @module api/recharge/recharge-subscription-update.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { makeRechargeQuery } from "../../lib/recharge/helpers.js";

/*
 * @function recharge/recharge-subscription-update.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */

// XXX Unused!

export default async (req, res, next) => {
  const data = {...req.body};
  const subscription_id = req.body.id;
  delete data.subscription_id;
  try {
    const result = await makeRechargeQuery({
      method: "PUT",
      path: `subscriptions/${subscription_id}`,
      body: JSON.stringify(data),
    });
    res.status(200).json(result);
  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};
