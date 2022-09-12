/*
 * @module api/recharge/recharge-customer-charges.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { makeRechargeQuery } from "../../lib/recharge/helpers.js";
import { gatherData, reconcileChargeGroup, reconcileGetGroups } from "../../lib/recharge/reconcile-charge-group.js";

const delay = (t) => {
  return new Promise(resolve => setTimeout(resolve, t));
};

const getCharges = async (customer_id) => {

  return charges;
};

/*
 * @function recharge/recharge-customer-charges.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {
  const shopify_customer_id = req.params.shopify_customer_id;
  //const customer_id = "3895947395222";
  try {
    const { customers } = await makeRechargeQuery({
      path: `customers`,
      query: [ ["external_customer_id", shopify_customer_id ] ]
    });
    if (!customers || !customers.length) {
      res.status(200).json([]);
      return;
    };

    const { charges } = await makeRechargeQuery({
      path: `charges`,
      query: [
        ["customer_id", customers[0].id ],
        ["status", "queued" ],
        ["sort_by", "scheduled_at-asc" ]
      ]
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
      console.log(createdSince);
      if (createdSince < 2) reload = true;
      // if this is less than say 2 minutes then wait and try again
      // this because it can take a few minutes to load all subscriptions into the charge via webhooks
    };

    res.status(200).json({ result, reload });
  } catch(err) {
    res.status(400).json({ error: err.toString() });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};

