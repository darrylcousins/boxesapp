/*
 * @module api/recharge/recharge-delete-subscription.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { gatherData, reconcileChargeGroup, reconcileGetGroups } from "../../lib/recharge/reconcile-charge-group.js";

/*
 * @function recharge/recharge-delete-subscription.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {
  const charge = req.body.charge;
  console.log(charge);

  // this is a dumb charge with the updated scheduled delivery

  const meta = {
    recharge: {
      updated_charge: charge.scheduled_at,
    },
  };

  try {

    const groups = reconcileGetGroups({ charges: [ charge ] });
    let result = [];

    for (const grouped of groups) {
      result = await gatherData({ grouped, result });
    };

    // always only one - should be
    res.status(200).json({ subscription: result[0] });
    _logger.notice(`Recharge updated subscription dates.`, { meta });

  } catch(err) {
    res.status(400).json({ error: err.toString() });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};


