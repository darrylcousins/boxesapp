/*
 * @module api/recharge/recharge-subscriptions.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { makeRechargeQuery } from "../../lib/recharge/helpers.js";

/*
 * @function recharge/recharge-subscriptions.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 *
 * Collect all the related subscribed products for a box subscription
 * Uses the recharge api XXX the extra products really need to have a link to
 * the actual box so need to use metadata to manage this.
 */
export default async (req, res, next) => {
  const next_charge_scheduled_at = req.params.next_charge_scheduled_at;
  const customer_id = req.params.customer_id;
  const address_id = req.params.address_id;
  const box_subscription_id = req.params.box_subscription_id;
  const query = [
    ["customer_id", customer_id],
    ["address_id", address_id],
    ["scheduled_at", next_charge_scheduled_at],
  ];
  try {
    const result = await makeRechargeQuery({
      path: "charges",
      query
    });
    // could be that the customer has more than one box subscribed
    // but XXX assumption can only be one result by customer and charge_date
    if (result.charges.length < 1) {
      res.status(200).json({ error: "not found" });
      return;
    };
    if (result.charges.length > 1) {
      res.status(200).json({ error: "too many not found" });
      return;
    };
    const charge = result.charges[0]
    if (!box_subscription_id) {
      res.status(200).json({ subscriptions: charge.line_items });
      return;
    };
    const included_subscriptions = charge.line_items
      .filter(el => {
        // el.external_product_id.ecommerce !== box_product_id
        const box_sub = el.properties.find(prop => prop.name === "box_subscription_id");
        if (!box_sub) return false;
        return box_sub.value === box_subscription_id;
      });

    // do I need to filter again by properties(name = "Add on product to").value === box_title???
    //const box_subscription = charge.line_items.find(el => el.external_product_id.ecommerce === box_product_id);
    //const box_title = box_subscription.title;

    res.status(200).json(included_subscriptions);

  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};
