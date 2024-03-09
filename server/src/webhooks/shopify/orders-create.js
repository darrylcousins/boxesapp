/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { updateStoreObject } from "../../lib/shopify/helpers.js";
import { weekdays } from "../../lib/dates.js";
import { sortObjectByKeys, delay } from "../../lib/helpers.js";
import { mongoInsert } from "../../lib/mongo/mongo.js";
import { processOrderJson } from "../../lib/orders.js";
import updateProductInventory from "./update-product-inventory.js";
import fs from "fs";

export default async function ordersCreate(topic, shop, body) {

  const mytopic = "ORDERS_CREATE";
  if (topic !== mytopic) {
    _logger.notice(`Shopify webhook ${topic} received but expected ${mytopic}`, { meta: { shopify: {} } });
    return;
  };

  const collection = _mongodb.collection("orders");
  const boxIds = await _mongodb.collection("boxes").distinct("shopify_product_id");
  // use to determine if this is a box order
  
  const orderJson = JSON.parse(body);

  const meta = {
    order: {
      shopify_order_id: orderJson.id,
    }
  };

  const orders = await processOrderJson(orderJson);

  let multiple = false;
  if (orders.length === 0) {
    meta.order = sortObjectByKeys(meta.order);
    _logger.notice(`${_filename(import.meta)} Create order webhook received but not a boxes order`, { meta });
    return;
  };

  if (orders.length > 1)  multiple = true;
  const order = orders[0];
  meta.order.delivered = order.delivered;
  meta.order.email = order.contact_email;
  // try to get the recharge customer id in here by looking up customer collection by email?
  const customer = await _mongodb.collection("customers").findOne({email: order.contact_email});
  if (customer) meta.order.customer_id = customer.recharge_id;
  await updateStoreObject(orderJson.id, 'order', {
    id: orderJson.id.toString(), tags: `${orderJson.tags},${order.delivered}`
  });
  const alpha = Array.from(Array(26)).map((e, i) => i + 65);
  const alphabet = alpha.map((x) => String.fromCharCode(x));

  for (const idx in orders) {
    const order = orders[idx];
    meta.order.box = order.box_name; // name the box with variant
    if (multiple) {
      meta.order.order_number = `${orderJson.order_number.toString()}${alphabet[idx]}`;
    } else {
      meta.order.order_number = orderJson.order_number.toString();
    };
    order.order_number = meta.order.order_number;

    // check delivery against cutoff moment and delivery day this may be an
    // abandoned cart that was picked up. I think the best solution is simply
    // to flag it as wrong and alert shop administrator with an alert box on orders page
    const delivered = new Date(order.delivered);
    const cutoff = await _mongodb.collection("settings").findOne({
      handle: "box-cutoff", weekday: new Intl.DateTimeFormat('en-NZ', {weekday: 'long'}).format(delivered)
    });
    let cutoffValue = 36.5; // set a reasonable default - get from settings!!!
    if (cutoff) cutoffValue = cutoff.value; // sanity check

    // the cutoff value is in hours
    // every order should be created before this moment
    // put into our timezone and add 24 hours so putting orders created on day of delivery
    delivered.setMinutes(delivered.getMinutes() - delivered.getTimezoneOffset());
    const deliveryMoment = Math.abs(delivered.getTime())/36e5;
    const cutoffMoment = deliveryMoment - cutoff.value;
    const created = new Date(order.created);
    const createdMoment = Math.abs(Date.parse(created))/36e5;
    if (createdMoment > cutoffMoment) {
      if (createdMoment > deliveryMoment) {
        order.error = "Created after delivery day";
        console.log("Created after delivery day");
      } else {
        order.error = "Created after cutoff moment";
        console.log("Created after cutoff moment");
      };
    };

    const result = await mongoInsert(collection, order);
    if (result.upsertedCount === 1) {
      meta.order = sortObjectByKeys(meta.order);
      _logger.notice(`Shopify webhook ${topic.toLowerCase().replace(/_/g, "/")} inserted.`, { meta });
      await delay(2000); // seems to be required when logging in succession 1sec worked but hey what's 2 secs?
    };
    updateProductInventory(order);
  };

  return true;
};
