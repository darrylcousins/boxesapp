/*
 * @module api/recharge/recharge-customer-charges.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { makeRechargeQuery } from "../../lib/recharge/helpers.js";
import { gatherData, reconcileChargeGroup, reconcileGetGrouped } from "../../lib/recharge/reconcile-charge-group.js";
import fs from "fs";

/*
 * @function recharge/recharge-customer-charge.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 *
 * This used primarily to reload the charge after editing i.e. in
 * components/subscription.js and cancelled.js where the subscription_id is
 * provided. It is also used in recharge admin to load a single charge cf all
 * customer charges (components/customers.js)
 */
export default async (req, res, next) => {

  let charge_id = req.params.charge_id;
  const { customer_id, subscription_id, address_id, scheduled_at } = req.query;

  try {
    let result = {};
    try {
      result = await makeRechargeQuery({
        path: `charges/${charge_id}`,
        title: `Get Charge (${charge_id})`,
      });

    } catch(err) {
      _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
      // err.message.contains("404") ??
      return res.status(200).json({ error: err.message });
    };


    // NOTE take a look at the routine in recharge-customer-charges - should I have the here
    if (result.charge) {
      const groups = [];
      const grouped = await reconcileGetGrouped({ charge: result.charge });
      //console.log(result.charge);
      //console.log(JSON.stringify(result.charge.line_items, null, 2));

      groups.push(grouped);
      let data = [];

      for (const grouped of groups) {
        data = await gatherData({ grouped, result: data });
      };

      if (subscription_id) {
        const subscription = data.find(el => el.attributes.subscription_id === parseInt(subscription_id));
        return res.status(200).json({ subscription });
      } else {
        return res.status(200).json({ charge: result.charge, subscriptions: data });
      };
    } else {
      return res.status(200).json({ error: "Not found" });
    };

  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};


