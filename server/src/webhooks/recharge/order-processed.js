/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { makeRechargeQuery, getSubscription, updateSubscription } from "../../lib/recharge/helpers.js";
import fs from "fs";

/*
 * Order can be of type "checkout" or "recurring", we only care about recurring orders
 * https://developer.rechargepayments.com/2021-11/orders/orders_object
 */

async function orderRecurring(order) {
  const topicLower = "order/processed";

  fs.writeFileSync(`recharge.order-recurring-${order.id}.json`, JSON.stringify(order, null, 2));

  try {
    let parent = null; // hang on the box subscription for logging
    let deliveryDate; // updated delivery date as string
    let currentDeliveryDate; // the current date for logging

    // loop line_items and find the parent box subscription and calculate new delivery date
    for (const line_item of order.line_items) {

      if (line_item.properties.some(el => el.name === "Including")) {
        // get the subscription so as to access order_interval_frequency
        const subscription = await getSubscription(line_item.purchase_item_id);
        const days = parseInt(subscription.order_interval_frequency) * 7; // number of weeks by 7

        parent = line_item; // save parent line_item for logging
        const properties = [ ...parent.properties ];
        const dateItem = properties.find(el => el.name === "Delivery Date");
        currentDeliveryDate = dateItem.value;
        const dateObj = new Date(Date.parse(currentDeliveryDate));
        dateObj.setDate(dateObj.getDate() + days);
        deliveryDate = dateObj.toDateString();
        break;
      } else {
        continue;
      };
    };

    // loop again to make updates to delivery date
    for (const line_item of order.line_items) {

      const properties = [ ...line_item.properties ];
      const dateItem = properties.find(el => el.name === "Delivery Date");
      const dateIdx = properties.indexOf(dateItem);
      dateItem.value = deliveryDate;
      properties[dateIdx] = dateItem;
      updateSubscription(line_item.purchase_item_id, { properties });

    };
    const meta = {
      recharge: {
        topic: topicLower,
        charge_id: order.charge.id,
        subscription_id: parent.purchase_item_id,
        customer_id: order.customer.id,
        address_id: order.address_id,
        shopify_order_id: order.external_order_id.ecommerce,
        box: `${parent.title} - ${parent.variant_title}`,
        delivered: currentDeliveryDate,
        next_delivery: deliveryDate,
        email: order.customer.email,
        type: order.type,
      }
    };
    _logger.notice(`Recharge webhook ${topicLower} received and delivery date updated.`, { meta });

  } catch(err) {
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};

async function orderCheckout(order) {
  const topicLower = "subscription/created";

  fs.writeFileSync(`recharge.order-checkout-${order.id}.json`, JSON.stringify(charge, null, 2));


};

/* https://developer.rechargepayments.com/2021-11/webhooks_explained
 * 
 * An order has been created from the charge
 */
export default async function orderProcessed(topic, shop, body) {

  const mytopic = "ORDER_PROCESSED";
  _logger.notice(`Recharge webhook ${mytopic} received`, { meta: { recharge: {} } });
  if (topic !== mytopic) {
    _logger.notice(`Recharge webhook ${topic} received but expected ${mytopic}`, { meta: { recharge: {} } });
    return;
  };

  const order = JSON.parse(body).order;

  fs.writeFileSync(`recharge.order-${order.type}-${order.id}.json`, JSON.stringify(order, null, 2));

  const topicLower = "order/processed";

  try {
    let parent = null; // hang on the box subscription for logging
    let deliveryDate; // updated delivery date as string
    let currentDeliveryDate; // the current date for logging

    // loop line_items and find the parent box subscription and calculate new delivery date
    for (const line_item of order.line_items) {

      if (line_item.properties.some(el => el.name === "Including")) {
        // get the subscription so as to access order_interval_frequency
        const subscription = await getSubscription(line_item.purchase_item_id);
        const days = parseInt(subscription.order_interval_frequency) * 7; // number of weeks by 7

        parent = line_item; // save parent line_item for logging
        const properties = [ ...parent.properties ];
        const dateItem = properties.find(el => el.name === "Delivery Date");
        currentDeliveryDate = dateItem.value;
        const dateObj = new Date(Date.parse(currentDeliveryDate));
        dateObj.setDate(dateObj.getDate() + days);
        deliveryDate = dateObj.toDateString();
        break;
      } else {
        continue;
      };
    };

    // loop again to make updates to delivery date
    for (const line_item of order.line_items) {

      const properties = [ ...line_item.properties ];
      const dateItem = properties.find(el => el.name === "Delivery Date");
      const dateIdx = properties.indexOf(dateItem);
      dateItem.value = deliveryDate;
      properties[dateIdx] = dateItem;
      updateSubscription(line_item.purchase_item_id, { properties });

    };
    const meta = {
      recharge: {
        topic: topicLower,
        charge_id: order.charge.id,
        subscription_id: parent.purchase_item_id,
        customer_id: order.customer.id,
        address_id: order.address_id,
        shopify_order_id: external_order_id.ecommerce,
        box: `${parent.title} - ${parent.variant_title}`,
        delivered: currentDeliveryDate,
        next_delivery: deliveryDate,
        email: order.customer.email,
        shopify_order_id: order.external_order_id.ecommerce,
        type: order.type,
      }
    };
    _logger.notice(`Recharge webhook ${topicLower} received and delivery date updated.`, { meta });

  } catch(err) {
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };

  return true;
};


