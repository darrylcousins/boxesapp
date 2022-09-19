/*
 * @module api/recharge/recharge-customer-charges.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { makeRechargeQuery } from "../../lib/recharge/helpers.js";
import { gatherData, reconcileChargeGroup, reconcileGetGroups } from "../../lib/recharge/reconcile-charge-group.js";
import fs from "fs";

const delay = (t) => {
  return new Promise(resolve => setTimeout(resolve, t));
};

/*
 * @function recharge/recharge-customer-charges.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {
  const customer_id = req.params.customer_id;
  const query = [
    ["customer_id", customer_id ],
    ["status", "queued" ],
    ["sort_by", "scheduled_at-asc" ],
  ];
  if (Object.hasOwnProperty.call(req.params, "address_id")) {
    query.push(["address_id", req.params.address_id]); // match address id
    query.push(["scheduled_at", req.params.scheduled_at]); // match scheduled
  };

  try {
    const { charges } = await makeRechargeQuery({
      path: `charges`,
      query
    });

    if (!charges || !charges.length) {
      // return a result of none
      res.status(200).json([]);
      return;
    };

    const groups = reconcileGetGroups({ charges });
    let result = [];

    for (const grouped of groups) {
      // run through each of these groups
      result = await gatherData({ grouped, result });
      // if anything to new then the page will force a reload
    };
    let reload = false;

    for (const charge of charges) {
      const created_at = new Date(Date.parse(charge.created_at));
      const now = new Date();
      const createdSince = Math.ceil(Math.abs(now - created_at) / (1000 * 60)); // in minutes
      if (createdSince < 2) reload = true;
      // if this is less than say 2 minutes then wait and try again
      // this because it can take a few minutes to load all subscriptions into the charge via webhooks
    };

    //fs.writeFileSync("recharge.subscription.json", JSON.stringify(result[0], null, 2));
    res.status(200).json({ result, reload });
  } catch(err) {
    res.status(400).json({ error: err.toString() });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};

