/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { updateStoreObject } from "../../lib/shopify/helpers.js";
import { mongoInsert } from "../../lib/mongo/mongo.js";
import { processOrderJson } from "../../lib/orders.js";
import updateProductInventory from "./update-product-inventory.js";

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
  //console.log(JSON.stringify(orderJson, null, 2));
  // assumes box to be first, this is fine for now but somewhat dodgy
  const order_number = orderJson.order_number.toString();
  const meta = {
    order: {
      shopify_order_id: orderJson.id,
      order_number: `#${order_number}`,
    }
  };
  // check firstly if order already stored
  // XXX this will fail when we have multiple boxes in a single order
  // We may then to add a counter to the order e.g. #1020A, #1020B???
  const orders = await collection.countDocuments({ order_number });
  if (orders > 0) {
    return;
  };
  // to determine if this is a box item?? Best would be to compare against list of boxes?
  // we don't get product_type in the order line item
  // do this differently to allow multiple boxes ???
  // test for properties is the only way me thinks
  let product_id = null;
  let box;
  for (const line_item of orderJson.line_items) {
    if (boxIds.includes(line_item.product_id)) {
      // a container box
      product_id = line_item.product_id;
      box = line_item;
      break;
    };
  };

  //const product_id = orderJson.line_items[0].product_id;
  if (!product_id) {
    _logger.notice(`${_filename(import.meta)} Create order webhook received but not a boxes order`, { meta });
    return;
  };
  meta.order.box = box.name;

  // check for open and fulfillment and paid??
  // check if tag already stored
  // for webhooks the body is a raw string
  const order = await processOrderJson(orderJson);
  meta.order.delivered = order.delivered;
  const result = await mongoInsert(collection, order);
  if (result.upsertedCount === 1) {
    _logger.notice(`Shopify webhook ${topic.toLowerCase().replace(/_/g, "/")} received.`, { meta });
  };
  const id = order.shopify_order_id.toString();
  updateStoreObject(id, 'order', {
    id, tags: order.delivered
  });
  updateProductInventory(order);
};
