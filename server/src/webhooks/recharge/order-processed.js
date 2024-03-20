/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { getSubscription, updateSubscription, makeRechargeQuery } from "../../lib/recharge/helpers.js";
import chargeProcessedMail from "../../mail/charge-processed.js";
import { sortObjectByKeys, matchNumberedString } from "../../lib/helpers.js";
import { writeFileForOrder, getMetaForCharge } from "./helpers.js";
import fs from "fs";

/* https://developer.rechargepayments.com/2021-11/webhooks_explained
 * 
 * An order has been created from the charge
 * We need to update all subscriptions to the next delivery date
 *
 * NOTE Returns false if no action is taken and true if some update occured
 *
 */
export default async function orderProcessed(topic, shop, body) {

  const mytopic = "ORDER_PROCESSED";

  if (topic !== mytopic) {
    _logger.notice(`Recharge webhook ${topic} received but expected ${mytopic}`, { meta: { recharge: {} } });
    return false;
  };
  const topicLower = "order/processed";

  const order = JSON.parse(body).order;

  writeFileForOrder(order, mytopic.toLowerCase().split("_")[1]);

  const chargeMeta = getMetaForCharge(order, topicLower);
  const meta = { recharge: {}};
  for (const [key, value] of Object.entries(chargeMeta.recharge)) {
    const newKey = key.replace("charge", "order");
    meta.recharge[newKey] = value;
  };
  meta.recharge.charge_id = order.charge.id;

  if (order.status !== "success") {
    meta.recharge.message = "Not sending email for unsuccessful order";
    meta.recharge = sortObjectByKeys(meta.recharge);
    _logger.notice(`Order processed status: ${order.status} for ${order.customer.email}.`, { meta });
    return false;
  };

  // initiate attributes
  const attributes = {
    charge_id: order.charge.id,
  };

  const line_items = [];
  // not really necessary because we make the following first loop
  for(var x in order.line_items) order.line_items[x].variant_title !== null ? order.line_items.unshift(order.line_items.splice(x,1)[0]) : 0;

  const lines = order.line_items.map(el => {
    return {
      purchase_item_id: el.purchase_item_id,
      title: el.title,
      quantity: el.quantity,
      properties: el.properties,
    };
  });
  _logger.notice(`Order line_items (charge: ${order.charge.id})`, { meta: { recharge: { 
    order_id: order.id,
    charge_id: order.charge.id,
    line_items: lines,
  }}});
  // Figure out how many box subscriptions are included in this order
  const box_subscriptions = {};
  try {
    for (const line_item of order.line_items) {
      const box_subscription_property = line_item.properties.find(el => el.name === "box_subscription_id");
      if (box_subscription_property) {
        const box_subscription_id = parseInt(box_subscription_property.value);
        if (!Object.hasOwn(box_subscriptions, box_subscription_id)) {
          box_subscriptions[box_subscription_id] = { box: {}, includes: [] };
        };
        if (line_item.properties.some(el => el.name === "Including")) {
          box_subscriptions[box_subscription_id].properties = line_item.properties;
        };
      };
    };
  } catch(err) {
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };

  /*
  for (const box of Object.values(box_subscriptions)) {
    console.log(box);
    if (box.includes.length > 0) console.log(box.includes);
  };
  */
  // if no box subscriptions then log and exit
  if (Object.keys(box_subscriptions).length === 0) {
    const err = {
      message: "Order processed but no box subscriptions found",
      order_number: order.external_order_name.ecommerce,
      customer_id: order.customer.id,
      address_id: order.address_id,
      charge_id: order.charge.id,
      order_id: order.id,
      first_name: order.billing_address.first_name,
      last_name: order.billing_address.last_name,
      email: order.customer.email,
    };
    _logger.notice({message: err.message, level: err.level, stack: err.stack, meta: err});
    return false;
  };
  
  const query = [
    ["limit", 250 ],
    ["status", "active" ],
    ["ids", Object.keys(box_subscriptions) ],
  ];
  const queryResult = await makeRechargeQuery({
    path: `subscriptions`,
    title: `Collecting subscriptions for order processed email`,
    query,
  });
  const fetchSubscriptions = queryResult.subscriptions;

  // initiate subscriptions object used to build a list of subscriptions
  const subscriptions = {};
  for (const el of Object.keys(box_subscriptions)) {
    subscriptions[el] = {
      id: el,
      includes: [],
      attributes: { ...attributes, totalPrice: 0, lastOrder: {}, subscription_id: el }, // avoid accidentally mutating the original
    };
  };

  // NOTE All of this is simply to gather the data for the email to customer
  // NOTE If proven successful then move the delivery updates into here too.
  try {
    let deliveryDate; // updated delivery date as string
    let nextChargeDate; // updated charge date as string
    let currentDeliveryDate; // the current date for logging
    let days;
    let box_subscription_id;
    let box_subscription_property;

    // XXX loop through, rather put ...
    // loop line_items and find the parent box subscription and calculate new delivery date
    for (const [box_subscription_id, box] of Object.entries(box_subscriptions)) {

      // get the subscription so as to access order_interval_frequency
      let boxSubscription = fetchSubscriptions.find(el => parseInt(el.id) === box_subscription_id);
      if (!boxSubscription) {
        boxSubscription = await getSubscription(box_subscription_id, "Fetching for order processed");
      };

      const line_item = order.line_items.find(el => el.purchase_item_id === parseInt(box_subscription_id));
      const idx = order.line_items.indexOf(line_item);
      order.line_items.splice(idx, 1); // remove this item
      subscriptions[box_subscription_id].attributes.title = line_item.title;
      subscriptions[box_subscription_id].attributes.variant = line_item.variant_title;
      subscriptions[box_subscription_id].attributes.subscription_id = line_item.purchase_item_id;
      subscriptions[box_subscription_id].attributes.frequency = `Delivery every ${
        boxSubscription.order_interval_frequency
      } ${
        boxSubscription.order_interval_unit
      }${
        boxSubscription.order_interval_frequency > 1 ? "s" : ""}`;
      days = parseInt(boxSubscription.order_interval_frequency) * 7; // number of weeks by 7

      const dateItem = box.properties.find(el => el.name === "Delivery Date");
      currentDeliveryDate = dateItem.value;
      const dateObj = new Date(Date.parse(currentDeliveryDate));
      dateObj.setDate(dateObj.getDate() + days);
      deliveryDate = dateObj.toDateString();
      dateObj.setDate(dateObj.getDate() - 3);
      nextChargeDate = dateObj.toDateString();
      
      // set the properties as an object instead of name/value pairs
      subscriptions[box_subscription_id].properties = box.properties.reduce( // old delivery date and properties
        (acc, curr) => Object.assign(acc,
          {
            [`${curr.name}`]: (curr.value === null || curr.value === "None") ? "" : curr.value
          }),
        {});

      // put together the attributes used in the email
      const boxName = `${line_item.title} - ${line_item.variant_title}`;
      const boxTitle = `${line_item.title}`;
      subscriptions[box_subscription_id].attributes.subscription_id = box_subscription_id;
      subscriptions[box_subscription_id].attributes.name = boxName;
      subscriptions[box_subscription_id].attributes.box = { name: boxName };
      subscriptions[box_subscription_id].box = { shopify_title: line_item.title };

      //const orderCreated = new Date(order.created_at);
      //orderCreated.setDate(orderCreated.getDate() + days); // calculate next charge date
      subscriptions[box_subscription_id].attributes.nextChargeDate = nextChargeDate;
      subscriptions[box_subscription_id].attributes.nextDeliveryDate = deliveryDate;
      subscriptions[box_subscription_id].attributes.lastOrder.delivered = currentDeliveryDate;
      subscriptions[box_subscription_id].attributes.lastOrder.box = { name: boxName };
      subscriptions[box_subscription_id].attributes.lastOrder.order_number = order.external_order_number.ecommerce;
      subscriptions[box_subscription_id].attributes.lastOrder.current = true; // flag the template to mark as current

      subscriptions[box_subscription_id].attributes.totalPrice += parseFloat(line_item.total_price);

      subscriptions[box_subscription_id].includes.unshift({
        shopify_product_id: parseInt(line_item.external_product_id.ecommerce),
        title: line_item.title,
        price: line_item.unit_price,
        quantity: line_item.quantity,
        total_price: line_item.total_price,
      });

      const lists = {}; // collect the included items for this subscription
      // decremented includes and addons to the number that should match includes
      lists["includes"] = subscriptions[box_subscription_id].properties["Including"]
        .split(",").filter(el => el !== "")
        .map(el => matchNumberedString(el))
        .filter(el => el.quantity > 1)
        .map(el => ({ title: el.title, quantity: el.quantity - 1 }));
      lists["swaps"] = subscriptions[box_subscription_id].properties["Swapped Items"]
        .split(",").filter(el => el !== "")
        .map(el => matchNumberedString(el))
        .filter(el => el.quantity > 1)
        .map(el => ({ title: el.title, quantity: el.quantity - 1 }));
      lists["addons"] = subscriptions[box_subscription_id].properties["Add on Items"]
        .split(",").filter(el => el !== "")
        .map(el => matchNumberedString(el));
      lists["removed"] = subscriptions[box_subscription_id].properties["Removed Items"]
        .split(",").filter(el => el !== "")
        .map(el => matchNumberedString(el))
        .map(el => ({ title: el.title, quantity: 1 })); // keeep as ones - they are never incrementd
      const includedSubscriptions = [ 
        ...lists["includes"],
        ...lists["swaps"],
        ...lists["addons"] ];

      let fixed_line_items = [];
      // NOTE using the lists to find the included line_item products, because
      // the properties may have swapped around
      for (const item of includedSubscriptions) {
        // but cannot find the same item?
        const line_el = order.line_items.find(el => {
          return el.title === item.title && el.quantity === item.quantity;
        });
        // NOTE fix the properties
        fixed_line_items.push({
          purchase_item_id: line_el.purchase_item_id,
          title: line_el.title,
          quantity: line_el.quantity,
          properties: [
            { name: "Delivery Date", value: currentDeliveryDate },
            { name: "Add on product to", value: boxTitle },
            { name: "box_subscription_id", value: box_subscription_id },
          ],
        });
        const idx = order.line_items.indexOf(line_el);
        order.line_items.splice(idx, 1); // remove this item
        subscriptions[box_subscription_id].attributes.totalPrice += parseFloat(line_el.total_price);
        subscriptions[box_subscription_id].includes.push({
          shopify_product_id: parseInt(line_el.external_product_id.ecommerce),
          title: line_el.title,
          price: line_el.unit_price,
          quantity: line_el.quantity,
          total_price: line_el.total_price,
        });
      };
    };
    // NOTE if successful we can move the delivery date update into here too
    _logger.notice(`Order line_items fixed (charge: ${order.charge.id})`, { meta: { recharge: {
      order_id: order.id,
      charge_id: order.charge.id,
      line_items: fixed_line_items,
    }}});

    // more attributes used in the email
    attributes.customer = order.customer;
    attributes.customer.first_name = order.billing_address.first_name;
    attributes.customer.last_name = order.billing_address.last_name;
    attributes.order_name = order.external_order_name.ecommerce;
    attributes.address = order.shipping_address;

    // reduce the object to a list of subscriptions
    const finalSubscriptions = Object.values(subscriptions);

    // fix total price which was added as floats
    for (const subscription of finalSubscriptions) {
      subscription.attributes.totalPrice = `${subscription.attributes.totalPrice.toFixed(2)}`;
    };

    if (order.line_items.length > 0) {
      // we should have accounted for all items
      _logger.error({
        message: "Extra line items in order",
        level: "error",
        meta: {
          order_id: order.id,
          charge_id: order.charge.id,
          email: order.customer.email,
          line_items: order.line_items 
        },
      });
    };

    meta.recharge = sortObjectByKeys(meta.recharge);
    _logger.notice(`Order processed for ${order.customer.email}.`, { meta });

    // send the email
    await chargeProcessedMail({ subscriptions: finalSubscriptions, attributes });

  } catch(err) {
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
    return false;
  };

  return true;
};
