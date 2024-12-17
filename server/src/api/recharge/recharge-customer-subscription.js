/*
 * @module api/recharge/recharge-customer-charge.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { makeRechargeQuery } from "../../lib/recharge/helpers.js";
import getLastOrder from "../../lib/recharge/get-last-order.js";
import { gatherVerifiedData } from "../../lib/recharge/verify-customer-subscriptions.js";
import { reconcileGetGrouped } from "../../lib/recharge/reconcile-charge-group.js";
import { getIOSocket } from "./lib.js";

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
 *
 * To run verifyCustomerSubscriptions we need a customer object as stored in local db
 */
export default async (req, res, next) => {

  let charge_id = req.params.charge_id;
  const { action, customer, subscription_id, address_id, scheduled_at, lastOrder } = req.body;

  let io;
  let session_id;
  let socket;
  if (Object.hasOwn(req.query, "session_id")) {
    req.body.session_id = req.query.session_id;

    socket = getIOSocket(req, true);
    io = socket.io;
    session_id = socket.session_id;
  };

  // can use all of these in the query

  try {
    // with a query on subscription_id!
    let result = {};
    const query = [];
    query.push(["customer_id", customer.id]);
    if (action !== "cancelled") query.push(["status", "queued"]); // status cancelled does not compute
    if (address_id) query.push(["address_id", address_id]);
    if (scheduled_at && action !== "cancelled") query.push(["scheduled_at", scheduled_at]);
    if (subscription_id) query.push(["purchase_item_id", subscription_id]);
    try {
      result = await makeRechargeQuery({
        path: `charges`,
        title: `Get charges ${ subscription_id }`,
        query,
        io,
      });

    } catch(err) {
      if (err.message.includes("404") && !customer) { // from admin
        // no need to log it
        const message = `Failed to find charges`;
        return res.status(200).json({ error: message });
      } else {
        _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
      };
    };

    if (result.charges) {
      // need to fetch recharge customer
      // XXX unless we pass one here!
      //const customer = await _mongodb.collection("customers").findOne({recharge_id: parseInt(customer_id)});
      if (!customer) {
        const res = await makeRechargeQuery({
          path: `customers/${customer.id}`,
          title: `Get Customer (${customer.id})`,
          io,
        });
        customer = res.customer;
      };

      // filter the charge line_items by the subscripion id!
      for (const charge of result.charges) {
        const line_items = [];
        for (const line of charge.line_items) {
          if (line.purchase_item_id === parseInt(subscription_id)) {
            line_items.push(line);
            continue;
          };
          const box_subscription_property = line.properties.find(el => el.name === "box_subscription_id");
          if (box_subscription_property && parseInt(box_subscription_property.value) === parseInt(subscription_id)) {
            line_items.push(line);
            continue;
          };
        };
        charge.line_items = line_items;
        if (lastOrder) charge.lastOrder = lastOrder;
      };

      const charges = result.charges.filter(el => el.line_items.length > 0);

      let subscription;

      let errors;
      if (action !== "cancelled") {

        const { data, errors: dataErrors } = await gatherVerifiedData({ charges, customer, io });
        subscription = data.find(el => el.attributes.subscription_id === parseInt(subscription_id));
        if (dataErrors) errors = dataErrors;

      } else {

        // also need to get the subscriptions because that is where cancel data is
        const cancelQuery = [
          ["customer_id", customer.id ],
          ["address_id", address_id ],
          ["status", "cancelled" ],
        ];
        // unsure why no charges are found?
        if (charges.length > 0) {
          cancelQuery.push(
            ["ids", result.charges[0].line_items.map(el => el.purchase_item_id)],
          );
        };

        const { subscriptions } = await makeRechargeQuery({
          path: `subscriptions`,
          query,
          title: "Cancelled subscriptions",
          io,
        });

        const finalSubscriptions = [];
        for (const el of subscriptions) {
          el.purchase_item_id = el.id // needed for grouping
          const box_subscription_id = el.properties.find(el => el.name === "box_subscription_id");
          if (box_subscription_id && parseInt(box_subscription_id.value) === subscription_id) {
            finalSubscriptions.push(el);
          };
        };

        const charge = {};
        charge.line_items = finalSubscriptions;
        charge.customer = { id: parseInt(customer.id) };
        charge.address_id = parseInt(address_id);
        charge.scheduled_at = null;

        const grouped = await reconcileGetGrouped({ charge });
        subscription = grouped[subscription_id];
        delete subscription.charge; // charge.line_items duplicated in result.includes
        subscription.subscription_id = parseInt(subscription_id);

        if (lastOrder) {
          subscription.lastOrder = lastOrder;
        } else {
          try {
            const orderQuery = {
              customer_id: result.box.customer_id,
              address_id: result.box.address_id,
              product_id: parseInt(result.box.external_product_id.ecommerce),
              subscription_id,
            };
            subscription.lastOrder = await getLastOrder(orderQuery, io);
          } catch(err) {
            subscription.lastOrder = {};
          };
        };

      };

      if (subscription) {
        subscription.completed_action = action;
        // emitting finish to stop loading routine
        if (io) io.emit("finished", { session_id, subscription_id });
        return res.status(200).json({ subscription, errors, action });
      } else {
        if (io) io.emit("error", `Not found ${subscription_id}`);
        if (io) io.emit("finished", { session_id, subscription_id });
        return res.status(200).json({ error: "Not found with subscription id" });
      };
    } else {
      res.status(200).json({ error: "Not found" });
    };
    
    return;

  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};


