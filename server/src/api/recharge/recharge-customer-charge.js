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
  const { customer_id, address_id, subscription_id, scheduled_at } = req.query;

  const query = {
    //charge_id: parseInt(charge.id), now trying to avoid this because of updating charge and new charges created.
    customer_id: parseInt(customer_id),
    address_id: parseInt(address_id),
    scheduled_at,
    subscription_id: parseInt(subscription_id),
  };
  //console.log("customer-charge query", query);
  const findPending = await _mongodb.collection("updates_pending").findOne(query);
  if (findPending) {
    charge_id = findPending.charge_id;
    // if this is a change date entry
    if (Object.hasOwnProperty.call(findPending, "updated_charge_date")) {
      if (findPending.updated_charge_date === true) {
        _logger.info("Deleting updates_pending at customer-charge api");
        const res = await _mongodb.collection("updates_pending").deleteOne(query);
      } else {
        // return something here while waiting for charge date to be fully updated
        // because the charge will be gone or no longer containing this subscription
        return res.status(200).json({ message: "Updates pending ..." });
      };
    } else {;
      return res.status(200).json({ message: "Updates pending ..." });
    };
  };

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
      _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
      return res.status(200).json({ error: err.message });
    };

    const groups = [];
    const grouped = await reconcileGetGrouped({ charge: result.charge });

    groups.push(grouped);
    let data = [];

    for (const grouped of groups) {
      data = await gatherData({ grouped, result: data });
    };

    if (result.charge) {
      const subscription = data.find(el => el.attributes.subscription_id === parseInt(subscription_id));
      return res.status(200).json({ subscription });
    } else {
      return res.status(200).json({ error: "Not found" });
    };

  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};


