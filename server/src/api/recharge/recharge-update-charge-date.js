/*
 * @module api/recharge/recharge-update-charge-date.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { makeRechargeQuery } from "../../lib/recharge/helpers.js";

/*
 * @function recharge/recharge-update-charge-date.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {
  const data = {...req.body}; // needs date: "2021-08-05" (yyyy-mm-dd)
  const subscription_ids = req.body.subscription_ids;
  delete data.subscription_ids;
  // also need properties updated for delivery day
  console.log(data);
  console.log(subscription_ids);
  try {
    for (const id of subscription_ids) {
      const result = await makeRechargeQuery({
        method: "PUT",
        path: `subscriptions/${subscription_id}/set_next_charge_date`,
        body: JSON.stringify(data),
      });
    };
    res.status(200).json({ success: true });
  } catch(err) {
    res.status(400).json({ error: err.toString() });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};

