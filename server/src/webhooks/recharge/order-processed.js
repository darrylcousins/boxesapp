/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { makeRechargeQuery, getSubscription, updateSubscription } from "../../lib/recharge/helpers.js";

/* https://developer.rechargepayments.com/2021-11/webhooks_explained
 * 
 * An order has been created from the charge
 */
export default async function orderProcessed(topic, shop, body) {

  const mytopic = "ORDER_PROCESSED";
  if (topic !== mytopic) {
    _logger.notice(`Recharge webhook ${topic} received but expected ${mytopic}`, { meta: { recharge: {} } });
    return;
  };
  const topicLower = topic.toLowerCase().replace(/_/g, "/");

  const order = JSON.parse(body).order;

  if (order.type === "checkout") return; // only process those "recurring"

  try {
    // need to loop through the line_items and updated the subscription properties to new delivery date
    // try getting the charge and using those line_items? But I found that the
    // line_items of a processed order of type "recurring" does not include the properties
    // So I can only go through each line_item - collect and update the subscription
    for (const id of order.line_items.map(el => el.purchase_item_id)) {
      const subscription = await getSubscription(id, 500); // delay each to avoid pushing too many calls
      const days = parseInt(subscription.order_interval_frequency) * 7; // number of weeks by 7
      const properties = [ ...subscription.properties ];
      const dateItem = properties.find(el => el.name === "Delivery Date");
      const dateIdx = properties.indexOf(dateItem);
      const dateObj = new Date(Date.parse(dateItem.value));
      dateObj.setDate(dateObj.getDate() + days);
      dateItem.value = dateObj.toDateString();
      properties[dateIdx] = dateItem;
      const result = await updateSubscription(id, { properties }, 500);
    };
    const meta = {
      recharge: {
        topic: topicLower,
        charge_id: order.charge.id,
        address_id: order.address_id,
        customer_id: order.customer.id,
        email: order.customer.email,
        shopify_order_id: order.external_order_id.ecommerce,
        type: order.type,
      }
    };
    _logger.notice(`Recharge webhook ${topicLower} received and delivery date updated.`, { meta });

    // now should be able to figure the next delivery date and update properties of all the line_items (i.e. subscriptions)
  } catch(err) {
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};


