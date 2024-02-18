/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { makeRechargeQuery, getSubscription, updateSubscription } from "../../lib/recharge/helpers.js";
import chargeProcessedMail from "../../mail/charge-processed.js";
import { sortObjectByKeys } from "../../lib/helpers.js";
import { writeFileForOrder } from "./helpers.js";

/* https://developer.rechargepayments.com/2021-11/webhooks_explained
 * 
 * An order has been created from the charge
 * We need to update all subscriptions to the next delivery date
 */
export default async function orderProcessed(topic, shop, body) {

  const mytopic = "ORDER_PROCESSED";

  if (topic !== mytopic) {
    _logger.notice(`Recharge webhook ${topic} received but expected ${mytopic}`, { meta: { recharge: {} } });
    return;
  };
  const topicLower = "order/processed";

  const order = JSON.parse(body).order;

  writeFileForOrder(order, mytopic.toLowerCase().split("_")[1]);

  // initiate attributes
  const attributes = {
    charge_id: order.charge.id,
  };

  // Figure out how many box subscriptions are included in this order
  let box_subscription_ids = [];
  try {
    for (const line_item of order.line_items) {
      if (line_item.properties.some(el => el.name === "box_subscription_id")) {
        box_subscription_ids.push(parseInt(line_item.properties.find(el => el.name === "box_subscription_id").value));
      };
    };
    const idSet = new Set(box_subscription_ids); // eliminate duplicates
    box_subscription_ids = Array.from(idSet);
  } catch(err) {
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };

  // if no box subscriptions then log and exit
  if (box_subscription_ids.length === 0) {
    const err = {
      message: "Order processed but no box subscriptions found",
      level: "error",
      stack: null,
      order_number: order.external_order_name.ecommerce,
      customer_id: order.customer.id,
      address_id: order.address_id,
      charge_id: order.charge.id,
      order_id: order.id,
      first_name: order.billing_address.first_name,
      last_name: order.billing_address.last_name,
      email: order.customer.email,
    };
    // log as an error because it will need investigating
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
    return;
  };
  
  // initiate subscriptions object used to build a list of subscriptions
  const subscriptions = {};
  for (const el of box_subscription_ids) {
    subscriptions[el] = {
      id: el,
      includes: [],
      attributes: { ...attributes, totalPrice: 0, lastOrder: {} }, // avoid accidentally mutating the original
    };
  };

  try {
    let deliveryDate; // updated delivery date as string
    let currentDeliveryDate; // the current date for logging
    let days;
    let box_subscription_id;
    let box_subscription_property;

    // loop line_items and find the parent box subscription and calculate new delivery date
    for (const line_item of order.line_items) {

      box_subscription_property = line_item.properties.find(el => el.name === "box_subscription_id");
      if (box_subscription_property) {
        box_subscription_id = box_subscription_property.value.toString();
      } else {
        box_subscription_id = null;
        continue; // not a box line_item so skip to next
      };

      if (line_item.properties.some(el => el.name === "Including")) {
        // get the subscription so as to access order_interval_frequency
        const boxSubscription = await getSubscription(line_item.purchase_item_id);
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

        const dateItem = line_item.properties.find(el => el.name === "Delivery Date");

        currentDeliveryDate = dateItem.value;
        const dateObj = new Date(Date.parse(currentDeliveryDate));
        dateObj.setDate(dateObj.getDate() + days);
        deliveryDate = dateObj.toDateString();
        
        // set the properties as an object instead of name/value pairs
        subscriptions[box_subscription_id].properties = line_item.properties.reduce( // old delivery date and properties
          (acc, curr) => Object.assign(acc,
            {
              [`${curr.name}`]: (curr.value === null || curr.value === "None") ? "" : curr.value
            }),
          {});

        // put together the attributes used in the email
        const boxName = `${line_item.title} - ${line_item.variant_title}`;
        subscriptions[box_subscription_id].attributes.name = boxName;
        subscriptions[box_subscription_id].attributes.box = { name: boxName };
        subscriptions[box_subscription_id].box = { shopify_title: line_item.title };

        const orderCreated = new Date(order.created_at);
        orderCreated.setDate(orderCreated.getDate() + days); // calculate next charge date
        subscriptions[box_subscription_id].attributes.nextChargeDate = orderCreated.toDateString();
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
      } else {
        subscriptions[box_subscription_id].attributes.totalPrice += parseFloat(line_item.total_price);
        subscriptions[box_subscription_id].includes.push({
          shopify_product_id: parseInt(line_item.external_product_id.ecommerce),
          title: line_item.title,
          price: line_item.unit_price,
          quantity: line_item.quantity,
          total_price: line_item.total_price,
        });
      };
    };

    // loop again to make updates to delivery date on each subscription
    for (const line_item of order.line_items) {

      const properties = [ ...line_item.properties ];
      const dateItem = properties.find(el => el.name === "Delivery Date");
      if (dateItem) {
        const dateIdx = properties.indexOf(dateItem);
        dateItem.value = deliveryDate; // always the same for every item on the order
        properties[dateIdx] = dateItem;
        await updateSubscription({ id: line_item.purchase_item_id, body: { properties }});
      };

    };

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

    // logged information
    const meta = {
      recharge: {
        topic: topicLower,
        charge_id: order.charge.id,
        [`subscription_id${box_subscription_ids.length > 0 ? "s" : ""}`]: box_subscription_ids, // store as array
        customer_id: order.customer.id,
        address_id: order.address_id,
        [`box${box_subscription_ids.length > 0 ? "es" : ""}`]: finalSubscriptions.map(el => el.attributes.name), // store as array
        delivered: currentDeliveryDate,
        next_delivery: deliveryDate,
        email: order.customer.email,
        shopify_order_id: order.external_order_id.ecommerce,
        shopify_order_number: order.external_order_name.ecommerce,
        type: order.type,
      }
    };
    meta.recharge = sortObjectByKeys(meta.recharge);
    _logger.notice(`Order processed and delivery date updated.`, { meta });

    // send the email
    await chargeProcessedMail({ subscriptions: finalSubscriptions, attributes });

  } catch(err) {
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };

  return;
};
