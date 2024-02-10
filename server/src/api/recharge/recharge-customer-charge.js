/*
 * @module api/recharge/recharge-customer-charges.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { ObjectID } from "mongodb";
import { makeRechargeQuery } from "../../lib/recharge/helpers.js";
import { gatherData, reconcileChargeGroup, reconcileGetGrouped } from "../../lib/recharge/reconcile-charge-group.js";
import fs from "fs";

/*
 * @function recharge/recharge-customer-charge.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 *
 * This used primarily to reload the charge after editing
 */
export default async (req, res, next) => {

  let charge_id = req.params.charge_id;

  // is this the updated scheduled_at?
  const { customer_id, address_id, subscription_id, scheduled_at } = req.query;

  try {
    let result = {};
    try {
      result = await makeRechargeQuery({
        path: `charges/${charge_id}`,
        title: "Get Charge",
        // debugging
        customer_id: parseInt(customer_id),
        subscription_id: parseInt(subscription_id),
      });

    } catch(err) {
      // so we don't have the correct charge_id - send message back
      // this will catch when the charge is not found
      // err.message.contains("404") ??
      _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
      return res.status(200).json({ error: err.message });
    };

    const groups = [];
    const grouped = await reconcileGetGrouped({ charge: result.charge });
    //console.log(result.charge);
    //console.log(JSON.stringify(result.charge.line_items, null, 2));

    groups.push(grouped);
    let data = [];

    for (const grouped of groups) {
      data = await gatherData({ grouped, result: data });
    };

    if (result.charge) {
      const subscription = data.find(el => el.attributes.subscription_id === parseInt(subscription_id));
      //console.log(subscription);
      //console.log(subscription.attributes.rc_subscription_ids);
      return res.status(200).json({ subscription });
    } else {
      return res.status(200).json({ error: "Not found" });
    };

  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};


