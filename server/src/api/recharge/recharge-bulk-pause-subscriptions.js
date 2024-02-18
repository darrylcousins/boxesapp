/*
 * @module api/recharge/get-subscriptions-by-date
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import subscriptionActionMail from "../../mail/subscription-action.js";
import { makeRechargeQuery, updateSubscription,  updateChargeDate } from "../../lib/recharge/helpers.js";
import { reconcileGetGrouped } from "../../lib/recharge/reconcile-charge-group.js";
import { formatDate, delay } from "../../lib/helpers.js";

const isValidDateString = (str) => {
  const d = new Date(Date.parse(str));
  return d instanceof Date && !isNaN(d);
};
/*
 * @function recharge/get-subscriptions-by-date
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {

  let io;
  let sockets;
  const { session_id } = req.body;

  if (typeof session_id !== "undefined") {
    sockets = req.app.get("sockets");
    if (sockets && Object.hasOwnProperty.call(sockets, session_id)) {
      const socket_id = sockets[session_id];
      io = req.app.get("io").to(socket_id);
      io.emit("message", "Received request, processing data...");
    };
  };

  const { chargeDate, message, selectedCustomers } = req.body;

  if (!isValidDateString(chargeDate)) {
    return res.status(200).json({ error: "Invalid Date" });
  };
  let nextChargeDate = new Date(Date.parse(chargeDate));
  nextChargeDate.setDate(nextChargeDate.getDate() + 7);

  // calculate the delivery date
  let nextDeliveryDate = new Date(nextChargeDate);
  nextDeliveryDate.setDate(nextDeliveryDate.getDate() + 3);

  if (io) io.emit("message", `Updating to new charge date: ${nextChargeDate.toDateString()}`);
  if (io) io.emit("message", `Updating to new delivery date: ${nextDeliveryDate.toDateString()}`);

  const collection = _mongodb.collection("customers");
  try {
    const customers = await collection.find({
      "recharge_id": { "$in": selectedCustomers },
      "charge_list": {
        $elemMatch: {
          $elemMatch:{
            $in:[chargeDate]
        }}}}).toArray();
    for (const customer of customers) {
      // now collect the charges for customer at this charge date, doing this
      // just in case localdb has fallen out of sync since nightly cronjob
      // updated the charge lists
      if (io) io.emit("message", `Customer: ${customer.first_name} ${customer.last_name}`);

      try {
        const res = await makeRechargeQuery({
          path: `charges`,
          query: [
            ["customer_id", customer.recharge_id ],
            ["scheduled_at", chargeDate ],
          ],
          io,
          session_id,
          title: "Fetch charges",
        });

        if (res.charges.length === 0) {
            if (io) io.emit("message", "No charges found");
        } else {
          for (const charge of res.charges) {
            // if customer has multiple addresses then more than one charge may be found
            // collect the included subscriptions
            const grouped = await reconcileGetGrouped({ charge });
            customer.id = customer.recharge_id;
            customer.external_customer_id = { ecommerce: customer.shopify_id };
            for (const group of Object.values(grouped)) {
              // need make up properties for updates
              const boxProperties = group.box.properties;
              const delivery = boxProperties.find(el => el.name === "Delivery Date");
              delivery.value = nextDeliveryDate.toDateString();
              const includeProperties = [
                { name: "Delivery Date", value: nextDeliveryDate.toDateString() },
                { name: "Add on product to", value: group.box.title },
                { name: "box_subscription_id", value: group.box.purchase_item_id.toString() },
              ];
              let properties;
              let title;
              let opts;
              for (const subscription of group.rc_subscription_ids) {
                if (io) io.emit("message", `Updating ${subscription.title} (${subscription.subscription_id})`);
              
                properties = (parseInt(subscription.subscription_id) === parseInt(group.box.purchase_item_id))
                  ? boxProperties : includeProperties;

                title = `Updating delivery date ${subscription.title}`;
                opts = {
                  id: subscription.subscription_id,
                  title,
                  body: { properties },
                  io,
                  session_id,
                };
                await updateSubscription(opts);

                await delay(1000); // delay a second before making next call

                title = `Updating charge date ${subscription.title}`;
                opts = {
                  id: subscription.subscription_id,
                  title,
                  //date: nextChargeDate.toISOString().split('T')[0],
                  date: formatDate(nextChargeDate),
                  io,
                  session_id,
                };
                await updateChargeDate(opts);
              };
              // compile data for email to customer
              const includes = group.included.map(el => {
                return {
                  title: el.title,
                  quantity: el.quantity,
                  shopify_product_id: el.external_product_id.ecommerce,
                };
              });
              includes.unshift({
                  title: `${group.box.title} - ${group.box.variant_title}`,
                  quantity: group.box.quantity,
                  shopify_product_id: group.box.external_product_id.ecommerce,
              });
              const attributes = {
                customer,
                content: message,
                nextChargeDate: nextChargeDate.toDateString(),
                nextDeliveryDate: nextDeliveryDate.toDateString(),
                title: group.box.title,
                variant: group.box.variant_title,
                subscription_id: group.box.purchase_item_id,
              };
              const mailOpts = {
                type: "paused",
                attributes,
                includes,
              };
              await subscriptionActionMail(mailOpts);
              if (io) io.emit("message", `Customer email sent (${customer.email})`);
            };
          };
        };
      } catch(err) {
        _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
      };

    };

    if (io) io.emit("finished", session_id);
    return res.status(200).json([]);
  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};



