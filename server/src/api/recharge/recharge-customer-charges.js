/*
 * @module api/recharge/recharge-customer-charges.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { makeRechargeQuery } from "../../lib/recharge/helpers.js";
import { gatherData, reconcileGetGroups } from "../../lib/recharge/reconcile-charge-group.js";
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

  let charges;
  try {
    const queryResult = await makeRechargeQuery({
      path: `charges`,
      query,
      title: "Charges",
    });
    charges = queryResult.charges;
  } catch(err) { // may be a 404;
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };

  try {
    if (!charges || !charges.length) {
      // so we'll check here against local db (updated nightly), perhaps a failed re-charge
      const customer = await _mongodb.collection("customers").findOne({
        recharge_id: parseInt(customer_id)
      });
      if (customer) {
        if (customer.subscriptions_active_count > 0 && customer.charge_list.length === 0) {
          return res.status(200).json({ message: "Charge error, this may mean that Recharge was unable to process a charge and your subscriptions have been paused." });
        };
      };
      // return a result of none
      return res.status(200).json({ message: "No upcoming charges found" });
    };

    const groups = await reconcileGetGroups({ charges });
    let result = [];

    const errors = [];
    const revisedGroups = [];
    // here we can catch orphaned subscriptions without causing too much trouble to the user
    for (const grouped of groups) {
      // this can be due to orphaned subscriptions so removed it from the listing and advise errors
      let error = false;
      for (const [id, group] of Object.entries(grouped)) {
        if (!group.box) {
          errors.push(`Orphaned items for box subscription id ${id}:`);
          for (const sub of group.charge.line_items) {
            const addonto = sub.properties.find(el => el.name.toLowerCase() === "add on product to");
            const delivery = sub.properties.find(el => el.name.toLowerCase() === "delivery date");
            errors.push(`\n${sub.title}; ${sub.purchase_item_id}; ${delivery && `${delivery.value}`}; ${addonto && `Add on to ${addonto.value}`}`);
          };
          error = true;
        };
      };
      if (!error) {
        revisedGroups.push(grouped);
      };
    };

    // we may still have some healthy subscriptions
    for (const grouped of revisedGroups) {
      result = await gatherData({ grouped, result });
    };
    //console.log(result);
    for (const item of result) {
      //console.log(item.updates);
      for (const up of item.updates) {
        //console.log(up);
      };
      //console.log(item.properties);
    };

    if (subscription_id) {
      const subscription = result.find(el => el.attributes.subscription_id === parseInt(subscription_id));
      return res.status(200).json({ subscription, errors: errors.join("\n") });
    } else {
      return res.status(200).json({ result, errors: errors.join("\n") });
    };

  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};

