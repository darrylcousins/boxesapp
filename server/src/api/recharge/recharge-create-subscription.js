/*
 * @module api/recharge/update-subscription.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import subscriptionActionMail from "../../mail/subscription-action.js";
import { makeRechargeQuery, updateSubscription } from "../../lib/recharge/helpers.js";
import { delay, sortObjectByKeys } from "../../lib/helpers.js";
import { getIOSocket, upsertPending, makeIntervalForFinish } from "./lib.js";

/*
 * @function recharge/update-subscription.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 *
 * This will update the box subscription with:
 *
 * 1. The box
 * 2. The variant i.e. the delivery day of week
 * 3. The frequency
 *
 * The customer has a add-box modal where the box type 
 * (small/med/large), and/or the variant (Tue/Thu/Sat), and/or the plan
 * (1 week/2 weeks) can all be added
 *
 * The supplied data is:
    body = {
      product_id: string,
      variant_id: string,
      product_title: string,
      variant_title: string,
      plan: string, JSON
      charge_id: string,
      subscription_id: string,
      price: string,
      scheduled_at: string, // formatted "yyyy-mm-dd"
      delivery_date: timestamp, // formatted "Tue Sep 21 2023"
      order_day_of_week: integer
      now: string
      navigator: string
      customer: string
    };
 *
 */
export default async (req, res, next) => {

  const { io, session_id } = getIOSocket(req);

  // i.e. in the try/catch statement send an error message back to browser

  const { body: data } = req;
  const counter = new Date();
  data.plan = JSON.parse(data.plan);
  data.properties = JSON.parse(data.properties);
  data.customer = JSON.parse(data.customer);
  const { now, navigator, admin, type } = data;
  delete data.box;

  let address_id;
  let address;

  // return early
  res.status(200).json({ messages: [
    `Creating new box subscription for ${data.customer.first_name} ${data.customer.last_name} <${data.customer.email}>`,
    `${data.product_title} - ${data.variant_title}, ${data.plan.name}`,
    `First delivery on ${data.delivery_date}`,
    `First charge due on ${new Date(Date.parse(data.scheduled_at)).toDateString()}`,
  ]});

  const meta = {
    recharge: {
      label: type,
      charge_id: "new",
      customer_id: data.customer.id,
      email: data.customer.email,
      box: `${data.product_title} - ${data.variant_title}`,
      scheduled_at: data.scheduled_at,
      delivered: data.delivery_date,
      plan: data.plan.name,
    }
  };
  let errMessage;
  try {
    try {

      meta.recharge = sortObjectByKeys(meta.recharge);
      _logger.notice(`Boxesapp api request subscription ${type}.`, { meta });

      // use a passed flag if the customer has no active subscriptions
      const query = [
        ["customer_id", data.customer.id ],
      ];
      if (data.customer.subscriptions_active_count > 0) {
        query.push(
          ["is_active", true ],
        );
      };
      const { addresses } = await makeRechargeQuery({
        path: `addresses`,
        query,
        title: "Get customer addresses",
        io,
        session_id,
      });
      address = addresses[0];
    } catch(err) { // may be a 404;
      throw err;
    };

    if (!address) {
      errMessage = `No addresses found for ${data.customer.first_name} ${data.customer.last_name}`;
      throw new Error(errMessage);
    };

    address_id = address.id; // just use the first active address
    io.emit("step", `Using address id: ${address_id}`);

    // now build the new subscription
    const insert = {
      address_id: address_id,
      charge_interval_frequency: data.plan.frequency,
      next_charge_scheduled_at: data.scheduled_at,
      order_interval_frequency: data.plan.frequency,
      order_interval_unit: data.plan.unit,
      order_day_of_week: data.order_day_of_week,
      plan_id: data.plan.id,
      quantity: 1,
      price: data.price,
      product_title: data.product_title,
      external_product_id: {
        ecommerce: data.product_id
      },
      external_variant_id: {
        ecommerce: data.variant_id
      },
    };
    // ok create the subscription
    const { subscription } = await makeRechargeQuery({
      path: "subscriptions",
      method: "POST",
      body: JSON.stringify(insert),
      title: `Create box subscription ${data.product_title}.`,
      io,
      session_id,
    });

    if (!subscription) {
      errMessage = "Creating a box subscription failed";
      throw new Error(errMessage);
    };

    const properties = Object.entries(data.properties).map(([name, value]) => ({ name, value }));
    const boxItem = properties.find(el => el.name === "box_subscription_id");
    if (boxItem) {
      boxItem.value = `${subscription.id}`;
    } else {
      properties.push({ name: "box_subscription_id", value: `${subscription.id}` }); 
    };

    const result = await updateSubscription({
      id: subscription.id,
      body: { properties },
      title: `Updating box subscription id ${data.product_title}`,
      io,
      session_id,
    });

    if (!result.subscription) {
      errMessage = "Failed to update the box subscription";
      throw new Error(errMessage);
    };

    io.emit("message", "Awaiting creation of the new charge");

    const mailOpts = {
      type,
      includes: [{
        title: data.product_title,
        price: data.price,
        quantity: 1,
        total_price: data.price,
        shopify_product_id: data.product_id,
      }],
      attributes: {
        subscription_id: subscription.id,
        title: data.product_title,
        variant: data.variant_title,
        totalPrice: data.price,
        lastOrder: null,
        customer: data.customer,
        nextChargeDate: new Date(Date.parse(data.scheduled_at)).toDateString(),
        nextDeliveryDate: data.properties["Delivery Date"],
        frequency: data.plan.name,
        scheduled_at: data.scheduled_at,
      },
      address,
      properties: data.properties,
      now,
      navigator,
      admin,
      change_messages: null,
    };

    const rc_subscription_ids = [{
      delivery_at: data.properties["Delivery Date"],
      price: data.price,
      quantity: 1,
      shopify_product_id: parseInt(data.product_id),
      subscription_id: parseInt(subscription.id),
      title: data.product_title,
      updated: true,
    }];

    // create an appropiate updates_pending entry so we can wait for the new or updated charge
    const entry_id = await upsertPending({
      action: "created",
      charge_id: null,
      customer_id: data.customer.id,
      address_id,
      subscription_id: subscription.id,
      scheduled_at: data.scheduled_at,
      deliver_at: data.properties["Delivery Date"],
      rc_subscription_ids,
      title: data.product_title,
      session_id,
    });

    if (io) {
      makeIntervalForFinish({req, io, session_id, entry_id, counter, admin, mailOpts });
    };

  } catch(err) { // may be a 404;
    io.emit("error", `Ooops an error has occurred: ${ err.message }`);
    let info = err;
    if (errMessage) {
      info = {
        message: err.message,
        customer_id: data.customer.id,
        email: data.customer.email,
        admin,
        action: "Create box subscription",
      };
    };
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: info});
  };

};
