/*
 * @module api/recharge/update-subscription.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import subscriptionActionMail from "../../mail/subscription-action.js";
import { makeShopQuery } from "../../lib/shopify/helpers.js";
import { makeRechargeQuery, updateSubscription, updateSubscriptions,  updateChargeDate, findBoxes } from "../../lib/recharge/helpers.js";
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

  // return early
  res.status(200).json({});

  try {

    const { charge } = await makeRechargeQuery({
      path: `charges/${data.charge_id}`,
      title: `Get Charge (${data.charge_id})`,
      // debugging
      subscription_id: parseInt(data.subscription_id),
      io,
      session_id,
    });

    const box = JSON.parse(data.box);
    const boxProperties = JSON.parse(data.properties);
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
        if (prop) prop.value = data.product_title;
        // for the actual box we now also want to update relevant properties
        prop = el.properties.find(el => el.name === "Including");
        if (prop) {
          el.external_product_id.ecommerce = data.product_id;
          el.external_variant_id.ecommerce = data.variant_id;
          el.title = data.product_title;
          el.variant_title = data.variant_title;
          el.price = data.price;
          fakeSubscription = { ...el };
          fakeSubscription.price = data.price;
          fakeSubscription.order_interval_frequency = data.plan.frequency;
          fakeSubscription.order_interval_unit = data.plan.unit;
          fakeSubscription.product_title = data.product_title;
          fakeSubscription.variant_title = data.variant_title;
          fakeSubscription.id = parseInt(data.subscription_id);
          const props = el.properties.reduce(
            (acc, curr) => Object.assign(acc, { [`${curr.name}`]: curr.value === null ? "" : curr.value }),
            {});
          const included = props["Including"] // only the 'extra' items
            .split(",").map(el => el.trim())
            .filter(el => el !== "" && el !== "None")
            .map(el => matchNumberedString(el))
            .map(el => ({ title: el.title, quantity: el.quantity - 1 }))
            .filter(el => el.quantity > 0); // only items with quantity > 1
          const addons = props["Add on Items"]
            .split(",").map(el => el.trim())
            .filter(el => el !== "" && el !== "None")
            .map(el => matchNumberedString(el));
          const swapped = props["Swapped Items"] // only the 'extra' items
            .split(",").map(el => el.trim())
            .filter(el => el !== "" && el !== "None")
            .map(el => matchNumberedString(el))
            .map(el => ({ title: el.title, quantity: el.quantity - 1 }))
            .filter(el => el.quantity > 0); // only items with quantity > 1
          if (custom_box_id && data.product_id === custom_box_id) {
            // special case of custom box
            // move swapped items to addon items (the subscribed item remains)
            // this will prompt a zeroing of unavailable items
            for (const item of [ ...swapped, ...included ]) {
              addons.push(item);
            };
            // clear the other properties for custom box
            for (const propName of ["Removed Items", "Swapped Items", "Including"]) {
              el.properties.find(el => el.name === propName).value = "";
            };
          } else {
            // but also need to account for incremented quantities and remove the extra subscription if unavailable
            // XXX an extra included needs to be moved to addons
            const boxIncludes = box.includedProducts.map(el => el.shopify_title);
            const boxAddons = box.addOnProducts.map(el => el.shopify_title);
            for (const el of included) {
              const idx = boxIncludes.indexOf(el.title);
              if (idx !== -1) {
                // push in the quantity from the current subscription includes
                boxIncludes[idx] = `${el.title} (${el.quantity + 1})`;
              } else {
                // not available in includes, by pushing it only addons then
                // the reconcile algorthim will pick up that it is unavailable
                // and will zero the update, therefore it will be removed
                addons.push(el); // quantity was fixed in makeing the included array
              };
            };
            for (const el of swapped) {
              const idx = boxAddons.indexOf(el.title);
              if (idx === -1) {
                // as above with extra includes
                addons.push(el); // quantity was fixed in makeing the included array
              };
            };
            el.properties.find(el => el.name === "Including").value = boxIncludes.join(",");
          };
          // reset the addon property, it may have been changed
          el.properties.find(el => el.name === "Add on Items").value = makeItemString(addons); // rejoin as string
          el.properties.find(el => el.name === "Swapped Items")
            .value = boxProperties["Swapped Items"]; // used the reconciled list
          el.properties.find(el => el.name === "Removed Items")
            .value = boxProperties["Removed Items"]; // used the reconciled list
          properties = el.properties;
          fakeSubscription.properties = properties;
        };
        return el;
      })
    );

    let subscription;
    if (box) {
      console.log("Box requires reconciliation");
      const grouped = await reconcileGetGrouped({ charge });
      grouped[data.subscription_id].subscription = fakeSubscription;
      // this works because the fake reconciles against an actual box

      let result = [];
      // must pass a subscription to the group else the original is fetched
      result = await gatherData({ grouped, result });

      subscription = result[0]; // only one because we have filtered line_items
    } else {
      console.log("Box does not require reconciliation");
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
        total_price: item.total_price,
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
        // found will be missing total_price
        tempPrice = parseFloat(found.price) * found.quantity;
        found.total_price = `${tempPrice.toFixed(2)}`
        final = { ...start, ...found };
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
      title: `${data.product_title} - ${data.variant_title}`,
      session_id,
      schedule_only: data.schedule_only,
    });

    try {

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

    } catch {
      if (io) io.emit("error", `Ooops an error has occurred ... ${ err.message }`);
      throw err;
    };
    
    for(var x in updates) updates[x].variant_title !== null ? updates.unshift(updates.splice(x,1)[0]) : 0;

    // don't update items for deletion
    // don't update frequency if not changed
    for (const update of updates.filter(el => el.quantity > 0)) {
      const body = {};
      let subtitle = "Updating";
      if (update.subscription_id === parseInt(data.subscription_id)) {
        subtitle = "Changing";
        // IF VARIANT CHANGED!
        if (data.variant_changed) {
          for (const key of [
            "variant_title",
            "external_variant_id"]) { 
            body[key] = update[key];
          };
        };
        // IF PRODUCT CHANGED!
        if (data.product_changed) {
          for (const key of [
            "product_title",
            "external_product_id"]) { 
            body[key] = update[key];
          };
        };
      };

      // IF SCHEDULE CHANGED!
      if (data.schedule_changed) {
        for (const key of [
          "order_interval_frequency",
          "order_day_of_week",
          "charge_interval_frequency",
          "order_interval_unit"]) { 
          body[key] = update[key];
          delete update[key];
        };
      };

      if (Object.keys(body).length) {
        const opts = {
          id: update.subscription_id,
          body,
          title: `${subtitle} subscription ${update.product_title}`,
          io,
          session_id,
        };
        await updateSubscription(opts);
        await delay(3000);
      };

      // this will update an existing charge with the matching scheduled_at or create a new charge
    };

    await delay(10000); // avoid possibly making second call to same resource

    // IF CHARGE DATE CHANGED!
    if (charge.scheduled_at !== data.scheduled_at) {
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
        await delay(3000);
      };
    };

    for (const update of updates) {
      delete update.external_product_id;
      delete update.external_variant_id;
      delete update.variant_title;
      delete update.product_title;
    };

    // don't update properties if not changed - i.e. only if delivery date changed
    await updateSubscriptions({ updates, io, session_id });

  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};

