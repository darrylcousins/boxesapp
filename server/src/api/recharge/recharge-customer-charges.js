/*
 * @module api/recharge/recharge-customer-charges.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { makeRechargeQuery } from "../../lib/recharge/helpers.js";
import { gatherData, reconcileChargeGroup, reconcileGetGroups } from "../../lib/recharge/reconcile-charge-group.js";
import fs from "fs";

/*
 * @function recharge/recharge-customer-charges.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {
  const { customer_id, address_id, scheduled_at, subscription_id } = req.params;

  const query = [
    ["customer_id", customer_id ],
    ["status", "queued" ],
    ["sort_by", "scheduled_at-asc" ],
  ];
  if (address_id) {
    query.push(["address_id", req.params.address_id]); // match address id
    query.push(["scheduled_at", req.params.scheduled_at]); // match scheduled
  };

  try {
    const { charges } = await makeRechargeQuery({
      path: `charges`,
      query,
      title: "Charges",
    });

    if (!charges || !charges.length) {
      // return a result of none
      res.status(200).json({ message: "No charges found" });
      return;
    };

    const groups = await reconcileGetGroups({ charges });
    let result = [];

    for (const grouped of groups) {
      // run through each of these groups
      result = await gatherData({ grouped, result });
      // if anything to new then the page will force a reload
    };

    if (subscription_id) {
      const subscription = result.find(el => el.attributes.subscription_id === parseInt(subscription_id));
      return res.status(200).json({ subscription });
    } else {
      return res.status(200).json({ result });
    };

  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};

