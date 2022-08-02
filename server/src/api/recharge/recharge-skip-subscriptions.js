/*
 * @module api/recharge/recharge-skip-subscriptions.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { makeRechargeQuery } from "../../lib/recharge/helpers.js";

/*
 * @function recharge/recharge-skip-subscriptions.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {
  const { subscription_ids, next_charge_date } = req.body;
  const body = { date: next_charge_date };
  res.status(200).json(body);

  return;
  try {
    const result = await makeRechargeQuery({
      path: `subscriptions/${subscription_id}/set_next_charge_date`,
      body: JSON.stringify({ date: next_charge_date }),
    });

    res.status(200).json(result);
  } catch(err) {
    res.status(400).json({ error: err.toString() });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};
