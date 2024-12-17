/*
 * @module api/recharge/update-subscription.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { makeShopQuery } from "../../lib/shopify/helpers.js";
import { makeRechargeQuery } from "../../lib/recharge/helpers.js";
import updateSubscriptions from "../../lib/recharge/update-subscriptions.js";
import { gatherData, reconcileGetGrouped } from "../../lib/recharge/reconcile-charge-group.js";
import { sortObjectByKeys, matchNumberedString, makeItemString, delay } from "../../lib/helpers.js";
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
      sku: string,
      scheduled_at: string, // formatted "yyyy-mm-dd"
      delivery_date: timestamp, // formatted "Tue Sep 21 2023"
      order_day_of_week: integer
      now: string
      navigator: string
      customer: string
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

  const { io, session_id } = getIOSocket(req);

  // i.e. in the try/catch statement send an error message back to browser

  const { body: data } = req;
  const counter = new Date();
  data.plan = JSON.parse(data.plan);
  const { now, navigator, admin, type } = data;

  try {

    // return early
    res.status(200).json({
      success: true,
      action: "changed",
      subscription_id: parseInt(data.subscription_id),
      scheduled_at: data.scheduled_at,
      nextchargedate: data.scheduled_at,
      nextdeliverydate: data.delivery_date,
    });

    const { address } = await makeRechargeQuery({
      path: `addresses/${data.address_id}`,
      title: `Get address ${ data.address_id }`,
      io,
      session_id
    });
    const { subscriptions } = await makeRechargeQuery({
      path: `subscriptions`,
      title: `Get subscriptions for change box (${data.subscription_id})`,
      query: [
        ["customer_id", data.customer.id],
        ["status", "active"],
        ["limit", 100],
        ["address_id", data.address_id],
      ],
      io,
      session_id,
    });
    for (const subscription of subscriptions) {
      subscription.purchase_item_id = subscription.id;
      subscription.title = subscription.product_title;
    };
    const charge = {
      shipping_address: address,
      customer: JSON.parse(data.customer),
      address_id: data.address_id,
      scheduled_at: data.orig_scheduled_at,
      line_items: subscriptions
    };
    const box = JSON.parse(data.box);
    const boxProperties = JSON.parse(data.properties);
    const boxUpdates = JSON.parse(data.updates);
    const boxMessages = JSON.parse(data.change_messages);
    // so these are the updated properties for the subscription - how now to get the updates?
    // I know I have the code to figure the updates

    // check for custom box
    const setting = await _mongodb.collection("settings").findOne({ handle: "custom-box-id" });
    const custom_box_id = setting ? setting.value : null;
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
    charge.line_items = await Promise.all(
      charge.line_items.map(async (el) => {
        let prop = el.properties.find(el => el.name === "Delivery Date");
        // this is so we reconcile against an actual box, it later put back the the data.delivery_date
        if (prop) prop.value = box.delivered; // later correct to the data.delivery_date
        prop = el.properties.find(el => el.name === "Add on product to");
        el.unit_price = el.price;
        if (prop) prop.value = data.product_title;
        // for the actual box we now also want to update relevant properties
        prop = el.properties.find(el => el.name === "Including");
        if (prop) {
          el.external_product_id.ecommerce = data.product_id;
          el.external_variant_id.ecommerce = data.variant_id;
          el.variant_title = data.variant_title;
          el.title = data.product_title;
          el.price = data.price;
          el.sku = data.sku;
          fakeSubscription = { ...el };
          fakeSubscription.price = data.price;
          fakeSubscription.order_interval_frequency = data.plan.frequency;
          fakeSubscription.order_interval_unit = data.plan.unit;
          fakeSubscription.product_title = data.product_title;
          fakeSubscription.variant_title = data.variant_title;
          fakeSubscription.id = parseInt(data.subscription_id);
          // these properties have already been reconciled and are sent as data.properties
          properties = Object.entries(boxProperties).map(([name, value]) => {
            return { name, value, };
          });
          properties.push({ name: "box_subscription_id", value: `${data.subscription_id}` });
          el.properties = properties;
          fakeSubscription.properties = properties;
        };
        return el;
      })
    );

    let subscription;
    if (box) {
      const grouped = await reconcileGetGrouped({ charge });
      grouped[data.subscription_id].subscription = fakeSubscription;
      // this works because the fake reconciles against an actual box
      console.log(grouped);

      let result = [];
      // must pass a subscription to the group else the original is fetched
      result = await gatherData({ grouped, result });
      console.log(result);

      subscription = result[0]; // only one because we have filtered line_items
    } else {
      subscription = { updates: [] };
    };

    const updates = [];
    let tempPrice;
    for (let item of charge.line_items) {
      let found = subscription.updates.find(el => el.subscription_id === item.purchase_item_id);
      let start = {
        subscription_id: item.purchase_item_id,
        quantity: item.quantity,
        properties: item.properties, // already updated???
        title: item.title,
        external_product_id: item.external_product_id,
        external_variant_id: item.external_variant_id,
        price: item.unit_price,
        sku: item.sku,
        total_price: item.total_price,
        order_day_of_week: data.order_day_of_week,
        order_interval_frequency: data.plan.frequency,
        charge_interval_frequency: data.plan.frequency,
        order_interval_unit: data.plan.unit,
        product_title: item.title,
        variant_title: item.variant_title,
      };
      if (boxUpdates.some(el => el.title === item.title)) {
        start.quantity = boxUpdates.find(el => el.title === item.title).quantity;
      };
      // fix any changes from the updates
      let final;
      if (found) {
        // found will be missing total_price
        tempPrice = parseFloat(found.price) * found.quantity;
        found.total_price = `${tempPrice.toFixed(2)}`
        final = { ...found, ...start };
      } else {
        final = start;
      };
      // the box
      if (parseInt(item.purchase_item_id) === parseInt(data.subscription_id)) {
        final.price = data.price;
        final.total_price = data.price; // alway quantity of one
        // need to set the Including property
      };

      // put the date back to the calculated date from the change-box-modal
      final.properties.find(el => el.name === "Delivery Date").value = data.delivery_date;
      updates.push(final);
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


    const type = "changed";
    // log the request
    const meta = {
      recharge: {
        label: type,
        title: `${data.product_title} - ${data.variant_title}`,
        customer_id: parseInt(charge.customer.id),
        shopify_customer_id: parseInt(charge.customer.external_customer_id.ecommerce),
        subscription_id: parseInt(data.subscription_id),
        email: charge.customer.email,
        rc_subscription_ids,
      }
    };
    for (const item of properties) {
      meta.recharge[item.name] = item.value;
    };
    for (const [key, value] of Object.entries(data)) {
      // box and last_order are too much information - could truncate them though
      if (!["box", "last_order"].includes(key)) {
        meta.recharge[key] = key.endsWith("_id") ? parseInt(value) : value;
      };
    };

    meta.recharge = sortObjectByKeys(meta.recharge);
    // remove some uncecessary fields from the log entry
    delete meta.recharge.admin;
    delete meta.recharge.session_id;
    delete meta.recharge.navigator;
    delete meta.recharge.now;
    delete meta.recharge.variant_id;
    delete meta.recharge.product_id;
    delete meta.recharge.customer;
    meta.recharge.type = type;
    meta.recharge.price = parseFloat(meta.recharge.price).toFixed(2);
    meta.recharge.plan = { name: meta.recharge.plan.name };
    _logger.notice(`Recharge customer api reqest subscription ${type}.`, { meta });

    // compile data for email to customer
    let includes = updates.filter(el => el.quantity > 0).map(el => {
      return {
        title: el.title,
        price: el.price,
        total_price: el.total_price,
        quantity: el.quantity,
        shopify_product_id: el.external_product_id.ecommerce,
      };
    });
    // filter out the box itself
    includes = includes.filter(el => el.shopify_product_id !== data.product_id);
    // and include the changed parent
    includes.unshift({
        title: `${data.product_title} - ${data.variant_title}`,
        price: data.price,
        total_price: data.price,
        quantity: 1, // always one eh
        shopify_product_id: data.product_id,
    });

    const attributes = {
      customer: JSON.parse(data.customer),
      address_id: parseInt(data.address_id),
      nextChargeDate: new Date(Date.parse(data.scheduled_at)).toDateString(),
      nextDeliveryDate: data.delivery_date,
      title: data.product_title,
      variant: data.variant_title,
      subscription_id: data.subscription_id,
      frequency: data.plan.name,
      lastOrder: data.last_order !== "undefined" ? JSON.parse(data.last_order) : null,
      scheduled_at: data.scheduled_at, // "yyyy-mm-dd" this will match the updated subscriptions and charges
    };

    const totalPrice = includes.map(el => parseFloat(el.price) * el.quantity).reduce((sum, el) => sum + el, 0);
    attributes.totalPrice = `${totalPrice.toFixed(2)}`;

    const entry_id = await upsertPending({
      action: type,
      address_id: parseInt(data.address_id),
      customer_id: charge.customer.id,
      charge_id: parseInt(data.charge_id),
      subscription_id: parseInt(data.subscription_id),
      scheduled_at: data.scheduled_at, // "yyyy-mm-dd" this will match the updated subscriptions and charges
      rc_subscription_ids,
      deliver_at: data.delivery_date, // formatted "Tue Sep 21 2023"
      title: `${data.product_title}`,
      session_id,
      schedule_only: data.schedule_only,
    });

    const mailOpts = {
      type,
      attributes,
      address: subscription.address,
      includes,
      now,
      navigator,
      admin,
      properties: boxProperties,
      change_messages: boxMessages,
    };

    if (io) {
      makeIntervalForFinish({req, io, session_id, entry_id, counter, admin, mailOpts });
    };

    for(var x in updates) updates[x].variant_title !== null ? updates.unshift(updates.splice(x,1)[0]) : 0;

    // don't update items for deletion
    // don't update frequency if not changed
    const allUpdates = [];
    for (const update of updates) {
      const body = {};
      body.title = update.title;
      if (update.subscription_id === parseInt(data.subscription_id)) {
        // IF VARIANT CHANGED!
        if (data.variant_changed || data.product_changed) {
          for (const key of [
            "variant_title",
            "external_variant_id",
            "product_title",
            "external_product_id",
            "price"]) { 
            body[key] = update[key];
            body.sku = data.sku;
          };
        };
      };
      // leave this out for deletions
      if (update.quantity > 0) {
        // IF SCHEDULE CHANGED!
        if (data.schedule_changed) {
          for (const key of [
            "order_interval_frequency",
            "charge_interval_frequency",
            "order_interval_unit",
            ]) { 
            body[key] = update[key];
          };
        };
        // IF CHARGE DATE CHANGED!
        if (data.variant_changed) {
          body.next_charge_scheduled_at = data.scheduled_at;
          body.order_day_of_week = data.order_day_of_week;
        };
        if (data.variant_changed || data.product_changed) {
          // will include the new delivery date and new product title
          body.properties = update.properties;
        };
        body.quantity = update.quantity;
      } else {
        body.quantity = 0;
      };

      if (Object.keys(body).length) {
        body.subscription_id = update.subscription_id;
        allUpdates.push(body);
      };
    };
    //console.log(JSON.stringify(allUpdates, null, 2));
    await updateSubscriptions({ address_id: parseInt(data.address_id), updates: allUpdates, req, io, session_id });

  } catch(err) {
    if (io) io.emit("error", `Ooops an error has occurred ... ${ err.message }`);
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};

