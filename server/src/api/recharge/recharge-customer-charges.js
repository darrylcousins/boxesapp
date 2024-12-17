/*
 * @module api/recharge/recharge-customer-charges.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { makeRechargeQuery } from "../../lib/recharge/helpers.js";
import { makeShopQuery } from "../../lib/shopify/helpers.js";
import { gatherVerifiedData } from "../../lib/recharge/verify-customer-subscriptions.js";
import getLastOrder from "../../lib/recharge/get-last-order.js";
import { getIOSocket } from "./lib.js";

/*
 * @function recharge/recharge-customer-charges.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {

  let io;
  let session_id;
  let socket;
  console.log(req.params);
  console.log(req.body);
  if (Object.hasOwn(req.params, "session_id")) {
    req.body.session_id = req.params.session_id;

    socket = getIOSocket(req, true);
    io = socket.io;
    session_id = socket.session_id;
  };

  const customer = req.body.customer;
  const price_table = req.body.price_table;
  const address_table = req.body.address_table;
  const chargeGroups = req.body.chargeGroups; // groups already held by caller
  const subscription_ids = req.body.subscription_ids; // subscription.includes

  const { customer_id } = req.params;

  const query = [];
  if (subscription_ids.length > 0) {
    // also empty if reloading after subscription created or cancelled
    query.push(["ids", subscription_ids]);
  };
  query.push(["customer_id", customer_id]);
  query.push(["status", "active"]);
  query.push(["limit", 100]);

  try {
    const { subscriptions } = await makeRechargeQuery({
        path: `subscriptions`,
        title: `Get subscriptions (customer: ${ customer_id })`,
        query,
        io,
        session_id
      });
    if (!subscriptions || subscriptions.length === 0) {
      return res.status(200).json({ message: "No upcoming charges found" });
    };

    // group first by address_id, and then by next_charge_scheduled_at
    const groups = [];
    for (const subscription of subscriptions) {
      if (!groups.some(el => Object.hasOwn(el, "address_id") && el.address_id === subscription.address_id)) {
        let address;
        if (!address_table.some(el => el.address_id === subscription.address_id)) {
          const addressQuery = await makeRechargeQuery({
            path: `addresses/${subscription.address_id}`,
            title: `Get address ${ subscription.address_id }`,
            io,
            session_id
          });
          address = addressQuery.address;
        } else {
          address = address_table.find(el => el.address_id === subscription.address_id).address;
        };
        groups.push({
          address,
          customer,
          address_id: subscription.address_id,
          customer_id: subscription.customer_id,
          subscriptions: [] });
      };
      if (!groups
        .find(el => el.address_id === subscription.address_id).subscriptions
        .some(el => Object.hasOwn(el, "scheduled_at") && el.scheduled_at === subscription.next_charge_scheduled_at)
      ) {
        groups
          .find(el => el.address_id === subscription.address_id).subscriptions
          .push({ scheduled_at: subscription.next_charge_scheduled_at, line_items: [] });
      };
      if (subscription.properties.some(el => el.name === "Including")) {
        if (!price_table.some(el => el.variant_id.toString() === subscription.external_variant_id.ecommerce)) {
          try {
            // need to get the actual price of box
            const { variant } = await makeShopQuery({
              path: `variants/${subscription.external_variant_id.ecommerce}.json`,
              fields: ["price"],
              title: `Get store price for ${subscription.product_title} ${subscription.variant_title}`,
              io,
            });
            price_table.push({ variant_id: subscription.external_variant_id.ecommerce, price: variant.price });
          } catch(err) {
            // 404 most likely
            _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
          };
        };
        // getLastOrder - setting this on subscription instead of charge - needs picking up
        const orderQuery = {
          customer_id: customer_id,
          product_id: parseInt(subscription.external_product_id.ecommerce),
          subscription_id: subscription.id,
        };
        subscription.lastOrder = await getLastOrder(orderQuery, io);
      };
      subscription.purchase_item_id = subscription.id; // historic from previously only using charge line_items
      subscription.title = subscription.product_title; // filled as for a line_item
      subscription.unit_price = subscription.price; // filled as for a line_item
      groups
        .find(el => el.address_id === subscription.address_id).subscriptions
        .find(el => el.scheduled_at === subscription.next_charge_scheduled_at).line_items
        .push(subscription);
    };

    const charges = [];
    for (const { address, address_id, customer, customer_id, subscriptions } of groups) {
      if (!address_table.some(el => el.address_id === address_id)) {
        address_table.push({ address_id, address });
      };
      for (const { scheduled_at, line_items } of subscriptions) {
        charges.push({
          id: null,
          address_id,
          scheduled_at,
          shipping_address: address,
          customer,
          line_items,
        });
      };
    };
    const { data, errors } = await gatherVerifiedData({ charges, customer, price_table, io });

    if (io) io.emit("progress", "Returning charge data ...");

    const result = chargeGroups.length > 0 && req.body.detail.action !== "cancelled" ? [ ...data, ...chargeGroups ] : data;
    return res.status(200).json({ result, errors, price_table, address_table });

  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};

