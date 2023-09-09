/*
 * @module api/recharge/update-subscription.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import subscriptionActionMail from "../../mail/subscription-action.js";
import { makeRechargeQuery, updateSubscriptions,  updateChargeDate } from "../../lib/recharge/helpers.js";
import { gatherData, reconcileGetGrouped } from "../../lib/recharge/reconcile-charge-group.js";
import { sortObjectByKeys } from "../../lib/helpers.js";
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
 * The customer has a change-box modal where the box type 
 * (small/med/large), and/or the variant (Tue/Thu/Sat), and/or the plan
 * (1 week/2 weeks) can all be changed
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
    };
 *
 * First check for upcoming box for the delivery date - if present then we must
 * reconcile the box subscription to the upcoming box. If not then make no
 * changes to the subscription includes.
 * XXX actually perhaps not? But what if we are past the upcoming charge, so yes, must.
 * Should I get the charge and use gatherData etc to reconcile the box and get list of updates?
 *
 * Secondly update all the subscriptions with data.
 *
 * Thirdly update next_charge_scheduled_at
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

  const { body: data } = req;
  data.plan = JSON.parse(data.plan);
  console.log(data);
  try {

    // check for custom box
    const setting = await _mongodb.collection("settings").findOne({ handle: "custom-box-id" });
    const custom_box_id = setting ? setting.value : null;
    const box = await _mongodb.collection("boxes").findOne({
      delivered: data.delivery_date,
      active: true,
      shopify_product_id: parseInt(data.product_id),
    });

    const { charge } = await makeRechargeQuery({
      path: `charges/${data.charge_id}`,
      title: "Get Charge",
      // debugging
      subscription_id: parseInt(data.subscription_id),
    });

    /* 
     * Reconstruct the charge and line_items to create a fake charge that can
     * be passed to existing algorithms that can determine updates on
     * reconciling to the new box.
     * In doing so line-items also receive other updates as requested (plan frequency for example)
     * Will also use the charge scheduled_at to determine if that needs to be updated.
     */

    // filter line_items to only use those of "this" box subscription
    charge.line_items = charge.line_items.filter(el => {
      const prop = el.properties.find(el => el.name === "box_subscription_id");
      if (prop && prop.value === data.subscription_id) return true;
      return false;
    });
    // update the delivery date and fix subscription line_item
    // create a "fake" subscription to pass to the group
    let fakeSubscription;
    let properties; // save this for the updates_pending entry
    charge.line_items = charge.line_items.map(el => {
      let prop = el.properties.find(el => el.name === "Delivery Date");
      if (prop) prop.value = data.delivery_date;
      prop = el.properties.find(el => el.name === "Add on product to");
      if (prop) prop.value = data.product_title;
      // for the actual box we now also want to update relevant properties
      prop = el.properties.find(el => el.name === "Including");
      if (prop) {
        el.external_product_id.ecommerce = data.product_id;
        el.external_variant_id.ecommerce = data.variant_id;
        el.title = data.product_title;
        el.variant_title = data.variant_title;
        el.total_price = data.price;
        el.unit_price = data.price;
        fakeSubscription = { ...el };
        fakeSubscription.price = data.price;
        fakeSubscription.order_interval_frequency = data.plan.frequency;
        fakeSubscription.order_interval_unit = data.plan.unit;
        fakeSubscription.product_title = data.product_title;
        fakeSubscription.variant_title = data.variant_title;
        fakeSubscription.id = parseInt(data.subscription_id);
        if (custom_box_id && data.product_id === custom_box_id) {
          // fix removed and swapped - this could be in reconcileChargeGroups
          for (const propName of ["Removed Items", "Swapped Items", "Including"]) {
            el.properties.find(el => el.name === propName).value = "";
          };
        };
        properties = el.properties;
      };
      return el;
    });

    /*
    console.log(charge.line_items.map(el => {
      return [ el.title, el.external_product_id.ecommerce ];
    }));
    console.log(fakeSubscription);
    */
    let subscription;
    if (box) {
      console.log("Box requires reconciliation");
      const grouped = await reconcileGetGrouped({ charge });
      grouped[data.subscription_id].subscription = fakeSubscription;

      let result = [];
      // must pass a subscription to the group else the original is fetched
      result = await gatherData({ grouped, result });

      subscription = result[0]; // only one because we have filtered line_items
      console.log(Object.keys(subscription));
      console.log(subscription.messages);
    } else {
      console.log("Box does not require reconciliation");
      subscription = { updates: [] };
    };

    // good, finally getting the updates required for reconciling the box
    // now need to merge this with all other line_items

    //console.log(data);
    const updates = [];
    for (const item of charge.line_items) {
      let found = subscription.updates.find(el => el.subscription_id === item.purchase_item_id);
      let start = {
        subscription_id: item.purchase_item_id,
        quantity: item.quantity,
        properties: item.properties, // already updated
        title: item.title,
        external_product_id: item.external_product_id,
        external_variant_id: item.external_variant_id,
        price: item.price,
        order_day_of_week: data.order_day_of_week,
        order_interval_frequency: data.plan.frequency,
        charge_interval_frequency: data.plan.frequency,
        order_interval_unit: data.plan.unit,
        product_title: item.title,
        variant_title: item.variant_title,
      };
      // fix any changes from the updates
      let final;
      if (found) {
        // this is where quantity = 0 could be inserted - hopefully
        final = { ...start, ...found, in_updates: true };
      } else {
        final = start;
      };
      updates.push(final);
    };

    for (const update of updates.map(el => {
      return { title: el.title, quantity: el.quantity, properties: el.properties, in_updates: el.in_updates };
    })) {
      console.log(update);
    };
    // add updated flag to rc_subscription_ids
    const update_shopify_ids = updates.map(el => el.external_product_id.ecommerce);

    let updated;
    const rc_subscription_ids = [];
    for (const item of updates) {
      rc_subscription_ids.push({
        shopify_product_id: parseInt(item.external_product_id.ecommerce),
        subscription_id: parseInt(item.subscription_id),
        quantity: parseInt(item.quantity),
        title: item.title,
        updated: update_shopify_ids.indexOf(item.external_product_id.ecommerce) === -1,
      });
    };
    const doc= {
      label: "CHARGE_DATE",
      charge_id: charge.id,
      customer_id: charge.customer.id,
      address_id: charge.address_id,
      subscription_id: parseInt(data.subscription_id),
      scheduled_at: data.scheduled_at, // this will match the updated subscriptions and charges
      rc_subscription_ids,
      updated_charge_date: false,
      timestamp: new Date(),
    };
    // these collected from the box subscription entry in line_items
    for (const item of properties) {
      doc[item.name] = item.value;
    };
    // create the entry - this should be resolved and eventually deleted through webhooks
    await _mongodb.collection("updates_pending").updateOne(
      { charge_id: charge.charge_id },
      { "$set" : doc },
      { "upsert": true }
    );

    // log the request
    const topicLower = "charge/update-box-subscription";
    const meta = {
      recharge: {
        label: "CHARGE_DATE",
        topic: topicLower,
        title: `${data.product_title} - ${data.variant_title}`,
        customer_id: charge.customer.id,
        shopify_customer_id: charge.customer.external_customer_id.ecommerce,
        subscription_id: data.subscription_id,
        email: charge.customer.email,
        rc_subscription_ids,
      }
    };
    for (const item of properties) {
      meta.recharge[item.name] = item.value;
    };
    for (const [key, value] of Object.entries(data)) {
      meta.recharge[key] = value;
    };

    meta.recharge = sortObjectByKeys(meta.recharge);
    _logger.notice(`Recharge customer api reqest ${topicLower}.`, { meta });

    await updateSubscriptions({ updates, io, session_id });

    if (charge.scheduled_at !== data.scheduled_at) {
      console.log("Changing charge date", data.scheduled_at, charge.scheduled_at);
      for (const update of updates.filter(el => el.quantity > 0)) {
        const opts = {
          id: update.subscription_id,
          title: `Updating charge date ${update.product_title}`,
          date: data.scheduled_at,
          io,
          session_id,
        };
        // this will update an existing charge with the matching scheduled_at or create a new charge
        await updateChargeDate(opts);
      };
    };

    // compile data for email to customer
    let includes = updates.filter(el => el.quantity > 0).map(el => {
      return {
        title: el.title,
        quantity: el.quantity,
        shopify_product_id: el.external_product_id.ecommerce,
      };
    });
    // filter out the box itself
    includes = includes.filter(el => el.shopify_product_id !== data.product_id);
    includes.unshift({
        title: `${data.product_title} - ${data.variant_title}`,
        quantity: 1, // always one eh
        shopify_product_id: data.product_id,
    });
    const attributes = {
      customer: charge.customer,
      nextChargeDate: new Date(Date.parse(data.scheduled_at)).toDateString(),
      nextDeliveryDate: data.delivery_date,
      title: data.product_title,
      variant: data.variant_title,
      subscription_id: data.subscription_id,
      delivery_schedule: data.plan.name,
    };
    const mailOpts = {
      type: "changed",
      attributes,
      includes,
    };
    await subscriptionActionMail(mailOpts);

    res.status(200).json({});
  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};

