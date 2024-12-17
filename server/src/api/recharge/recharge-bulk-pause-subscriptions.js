/*
 * @module api/recharge/get-subscriptions-by-date
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import subscriptionActionMail from "../../mail/subscription-action.js";
import { makeRechargeQuery, updateSubscription } from "../../lib/recharge/helpers.js";
import { gatherData, reconcileGetGrouped } from "../../lib/recharge/reconcile-charge-group.js";
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

  const { chargeDate, message, selectedCharges } = req.body;

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

  const updatedSubscriptions = [];
  try {
    for (const charge_id of selectedCharges) {
      try {
        const res = await makeRechargeQuery({
          path: `charges/${charge_id}`,
          io,
          session_id,
          title: `Fetch charge (${charge_id})`,
        });

        if (res.charge) {
          const charge = res.charge;
          let result, title, opts, mailOpts;

          const grouped = await reconcileGetGrouped({ charge });

          result = [];
          result = await gatherData({ grouped, result });
          const update = {};
          for (const [idx, subscription] of result.entries()) {
            subscription.attributes.previousDeliveryDate = subscription.attributes.nextDeliveryDate;
            subscription.attributes.previousChargeDate = subscription.attributes.nextChargeDate;

            subscription.attributes.nextDeliveryDate = nextDeliveryDate.toDateString();
            subscription.attributes.nextChargeDate = nextChargeDate.toDateString();

            let boxProperties = { ...subscription.properties };
            boxProperties["Delivery Date"] = nextDeliveryDate.toDateString();
            const updatedProperties = { ...boxProperties };
            boxProperties = Object.entries(boxProperties).map(([name, value]) => ({name, value}));
            const includeProperties = [
              { name: "Delivery Date", value: nextDeliveryDate.toDateString() },
              { name: "Add on product to", value: subscription.box.shopify_title },
              { name: "box_subscription_id", value: subscription.attributes.subscription_id.toString() },
            ];
            const next_charge_scheduled_at = formatDate(nextChargeDate);

            for (const product of subscription.attributes.rc_subscription_ids) {
              if (io) io.emit("message", `Updating ${product.title} (${product.subscription_id})`);
            
              // fix Delivery Date
              const properties = (parseInt(product.subscription_id) === parseInt(subscription.attributes.subscription_id))
                ? boxProperties : includeProperties;

              if (parseInt(product.subscription_id) === parseInt(subscription.attributes.subscription_id)) {
                if (!Object.hasOwnProperty.call(update, "boxes")) update.boxes = [];
                update.boxes.push(product);
              };
              title = `Updating charge and delivery date ${product.title}`;
              opts = {
                id: product.subscription_id,
                title,
                body: {
                  properties,
                  next_charge_scheduled_at,
                },
                io,
                session_id,
              };
              await updateSubscription(opts);

              await delay(1000); // delay a second before making next call

            };
            // sending an email per subscription
            // add in the extra content text from admin when bulk pausing
            subscription.attributes.content = message;
            mailOpts = {
              type: "paused",
              attributes: subscription.attributes,
              includes: subscription.includes,
              properties: updatedProperties,
              address: subscription.address,
              admin: true,
            };
            update.customer = subscription.attributes.customer;

            await subscriptionActionMail(mailOpts);
            if (io) io.emit("message", `Customer email sent (${subscription.attributes.customer.email})`);
          };
          updatedSubscriptions.push(update);
        };
      } catch(err) {
        _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
      };

    };

    if (io) io.emit("finished", { session_id, updated: updatedSubscriptions }); // maybe add list of updated subscriptions here?
    return res.status(200).json([]);
  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};



