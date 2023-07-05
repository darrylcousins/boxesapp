/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { mongoUpdate } from "../../lib/mongo/mongo.js";
import { sortObjectByKeys } from "../../lib/helpers.js";

export default async function ordersUpdated(topic, shop, body) {

  const mytopic = "ORDERS_UPDATED";
  if (topic !== mytopic) {
    _logger.notice(`Shopify webhook ${topic} received but expected ${mytopic}`, { meta: { shopify: {} } });
    return;
  };

  // primary pupose to update delivery date if tag has been changed
  const collection = _mongodb.collection("orders");
  const orderJson = JSON.parse(body);
  // Updating 
  try {
    for (const tag of orderJson.tags.split(",").map(el => el.trim()).filter(el => el !== "")) {
      const parsed = Date.parse(tag);
      if (Boolean(parsed)) {  // testing for actual date object
        const date = new Date(parsed);
        const pickup = new Date(parsed); // begin with assumption that pickup same as delivered
        const order = await collection.findOne({shopify_order_id: parseInt(orderJson.id)});
        if (order) {
          if (Boolean(Date.parse(order.pickup))) {
            // keep pickup same time delta from delivered
            const currentPickup = new Date(Date.parse(order.pickup));
            const currentDelivered = new Date(Date.parse(order.delivered));
            const deltaday = currentDelivered.getDate() - currentPickup.getDate();
            pickup.setDate(pickup.getDate() - deltaday);
          }
          if (tag !== order.delivered) {
            const data = {
              _id: order._id,
              delivered: date.toDateString(),
              pickup: pickup.toDateString(),
            }
            const result = await mongoUpdate(collection, data);
            if (result.modifiedCount === 1) {
              const meta = {
                order: {
                  shopify_order_id: orderJson.id,
                  order_number: orderJson.order_number.toString(),
                  delivered: date.toDateString(),
                }
              };
              meta.order = sortObjectByKeys(meta.order);
              _logger.notice(`Shopify webhook ${topic.toLowerCase().replace(/_/g, "/")} received.`, { meta });
            };
          };
        };
      };
    };
  } catch(err) {
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
    return;
  };
  return true;
};
