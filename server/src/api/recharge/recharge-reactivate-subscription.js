/*
 * @module api/recharge/recharge-reactivate-subscription.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { makeRechargeQuery, updateSubscription,  updateChargeDate } from "../../lib/recharge/helpers.js";
import { formatDate, sortObjectByKeys } from "../../lib/helpers.js";
import { getIOSocket, upsertPending, makeIntervalForFinish } from "./lib.js";

/*
 * @function recharge/recharge-reactivate-subscription.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {

  const { io, session_id } = getIOSocket(req);

  const counter = new Date();
  const nextchargedate = req.body.nextchargedate;
  const nextdeliverydate = req.body.nextdeliverydate;
  const { navigator, now, admin } = req.body;

  const box = JSON.parse(req.body.box);
  const includes = JSON.parse(req.body.includes);
  const attributes = JSON.parse(req.body.attributes);

  const { product_title: title, properties: propertyList, customer_id, address_id, id: subscription_id } = box;
  const properties = propertyList.reduce(
    (acc, curr) => Object.assign(acc, { [`${curr.name}`]: curr.value === null ? "" : curr.value }),
    {});

  // add updated flag to rc_subscription_ids
  // rc_subscription_ids should have everything in includes
  const subscription_ids = includes.map(el => {
    return { 
      subscription_id: el.id,
      shopify_product_id: parseInt(el.external_product_id.ecommerce),
      quantity: el.quantity,
      updated: false
    };
  });

  // set dates
  let chargeDate = new Date(Date.parse(nextchargedate));
  const nextChargeDate = formatDate(chargeDate);

  const topicLower = "subscription/reactivated";
  const meta = {
    recharge: {
      label: "REACTIVATE",
      topic: topicLower,
      charge_id: null,
      customer_id: customer_id,
      address_id,
      subscription_id,
      next_delivery: nextdeliverydate,
      next_charge_date: nextchargedate,
      rc_subscription_ids: subscription_ids,
    }
  };
  for (const [key, value] of Object.entries(properties)) {
    meta.recharge[key] = value;
  };

  const child_props = {
    "Delivery Date": nextdeliverydate,
    "Add on product to": title,
    "box_subscription_id": `${subscription_id}` // must be a string
  };
  const child_properties = Object.entries(child_props).map(([name, value]) => {
    return { name, value };
  });
  const parent_props = { ...properties,
    "Delivery Date": nextdeliverydate,
    "box_subscription_id": `${subscription_id}` // must be a string
  };
  const parent_properties = Object.entries(parent_props).map(([name, value]) => {
    return { name, value };
  });

  const updates = [];
  // box subscription is not included in the includes
  // put it at the end initially
  for (const subscription of includes) {
    const props = (subscription.id === subscription_id) ? parent_properties : child_properties;
    updates.push({
      id: subscription.id,
      title: subscription.product_title,
      properties: props,
    });
  };

  const type = "reactivated";

  try {

    const entry_id = await upsertPending({
      action: "reactivated",
      customer_id,
      address_id,
      subscription_id,
      scheduled_at: nextChargeDate,
      deliver_at: nextdeliverydate,
      rc_subscription_ids: subscription_ids,
      title,
      session_id,
    });

    try {

      // missing total_price
      const adjusted = includes.map(el => {
        return {
          ...el,
          total_price: el.price,
          title: el.product_title,
          shopify_product_id: el.external_product_id.ecommerce,
        };
      });
      const totalPrice = includes.map(el => parseFloat(el.price) * el.quantity).reduce((sum, el) => sum + el, 0);
      attributes.totalPrice = `${totalPrice.toFixed(2)}`;

      const mailOpts = {
        type,
        includes: adjusted,
        attributes,
        now,
        navigator,
        admin,
      };

      if (io) {
        makeIntervalForFinish({req, io, session_id, entry_id, counter, admin, mailOpts });
      };

    } catch(err) {
      if (io) io.emit("error", `Ooops an error has occurred ... ${ err.message }`);
      throw err;
    };

    res.status(200).json({
      success: true,
      action: type,
      subscription_id: box.id,
      address_id,
      customer_id,
      scheduled_at: nextChargeDate,
    });

    meta.recharge = sortObjectByKeys(meta.recharge);
    _logger.notice(`Recharge customer api request ${topicLower}.`, { meta });

    // update for email template
    for (const el of includes) {
      el.title = el.product_title;
      el.shopify_product_id = el.external_product_id.ecommerce;
    };
    attributes.nextChargeDate = nextchargedate;
    attributes.nextDeliveryDate = nextdeliverydate;

    // first activated the subscription, curious to see what charge date it gives, still don't know
    for (const update of updates) {
      const opts = {
        method: "POST",
        title: update.title,
        path: `subscriptions/${update.id}/activate`,
        title: `Reactivate ${update.title}`,
        io,
        session_id,
      };
      await makeRechargeQuery(opts)
    };

    // then update properties [Delivery Date]
    for (const update of updates) {
      const opts = {
        id: update.id,
        title: update.title,
        body: { properties: update.properties },
        io,
        session_id,
      };
      await updateSubscription(opts);
    };

    // make sure that the box is first for final update
    for(var x in updates) updates[x].properties.some(el => el.name === "Including") ? updates.unshift(updates.splice(x,1)[0]) : 0;

    // finally the charge date
    for (const update of updates) {
      const opts = {
        id: update.id,
        title: update.title,
        date: nextChargeDate,
        io,
        session_id,
      };
      // this will update an existing charge with the matching scheduled_at or create a new charge
      await updateChargeDate(opts);
    };

  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};


