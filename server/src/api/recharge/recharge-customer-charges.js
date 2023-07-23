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
      return res.status(200).json({ message: "No charges found" });
    };

    // need to check for pending and return updates_pending
    // because when reactivating the charge will initially not have all line_items
    // only called from components: Customer and Cancelled, only cancelled passed a subscription_id
    // note that the updated subscription may have been merged in an existing charge
    if (charges.length === 1 && subscription_id) {
      const charge = charges[0];
      // charge_id matches here also by now
      const query = {
        subscription_id: parseInt(subscription_id),
        customer_id: charge.customer.id,
        address_id: charge.address_id,
        scheduled_at: charge.scheduled_at,
      };
      // all rc_subscription_ids are true for this query
      const updates_pending = await _mongodb.collection("updates_pending").findOne(query);
      if (updates_pending) {
        // XXX should I update the charge_id, at this point it will be null
        // check that they have all been updated
        const rc_subscription_ids = [];
        for (const el of charge.line_items) {
          // only match those with correct property box_subscription_id

          const prop = el.properties.find(el => el.name === "box_subscription_id");
          if (prop && parseInt(prop.value) === parseInt(subscription_id)) {
            rc_subscription_ids.push({
              subscription_id: el.item_purchase_id,
              shopify_product_id: parseInt(el.external_product_id.ecommerce),
              quantity: el.quantity,
            });
          };
        };
        const allUpdated = updates_pending.rc_subscription_ids.every(el => {
          // check that all subscriptions have updated or been created
          return el.updated === true && Number.isInteger(el.subscription_id);
        });
        const countMatch = updates_pending.rc_subscription_ids.length === rc_subscription_ids.length;
        if (allUpdated && countMatch) {
          _logger.info(`customer-charges removing entry in updates pending`);
          await _mongodb.collection("updates_pending").deleteOne(query);
        };
        // still pending
        if (!allUpdated || !countMatch) {
          return res.status(200).json({ message: "Updates pending" });
        };
      };
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

