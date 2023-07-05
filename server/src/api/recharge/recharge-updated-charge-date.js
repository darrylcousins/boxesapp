/*
 * @module api/recharge/recharge-updated-charge-date.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { gatherData, reconcileChargeGroup, reconcileGetGroups } from "../../lib/recharge/reconcile-charge-group.js";
import { makeRechargeQuery } from "../../lib/recharge/helpers.js";

/*
 * @function recharge/recharge-updated-charge-date.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {
  const charge = req.body.charge;

  // this is a dumb charge with the updated scheduled delivery
  if (!Object.hasOwnProperty.call(charge, "shipping_address")) {
    const { address } = await makeRechargeQuery({
      method: "GET",
      path: `addresses/${charge.line_items[0].address_id}`,
    });
    charge.shipping_address = address;
    const { customer } = await makeRechargeQuery({
      method: "GET",
      path: `customers/${charge.line_items[0].customer_id}`,
    });
    charge.customer = customer;
  };

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
    res.status(200).json({ error: err.messsage });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};


