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
  const { customer_id, address_id, rc_subscription_ids, subscription_id, scheduled_at } = req.query;

  const query = {
    //charge_id: parseInt(charge.id), now trying to avoid this because of updating charge and new charges created.
    customer_id: parseInt(customer_id),
    address_id: parseInt(address_id),
    next_charge_date: scheduled_at,
    subscription_id: parseInt(subscription_id),
    // hope that works testing in array of arrays
    rc_subscription_ids: JSON.parse(rc_subscription_ids),
  };
  const findPending = await _mongodb.collection("updates_pending").findOne(query);
  if (findPending) charge_id = findPending.charge_id; // it has been updated by charge/created

  try {

    let result = {};
    try {
      result = await makeRechargeQuery({
        path: `charges/${charge_id}`,
      });

    } catch(err) {
      // this will catch when the charge is not found
      return res.status(200).json({ error: err.message });
      _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
    };

    const groups = [];
    const grouped = reconcileGetGrouped({ charge: result.charge });

    groups.push(grouped);
    let data = [];

    for (const grouped of groups) {
      data = await gatherData({ grouped, result: data });
    };

    if (result.charge) {
      return res.status(200).json({ subscription: data[0] });
    } else {
      return res.status(200).json({ error: "Not found" });
    };

  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};


