/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { writeFileForOrder } from "./helpers.js";

/* https://developer.rechargepayments.com/2021-11/webhooks_explained
 * 
 * An order has been created from the charge
 * We need to update all subscriptions to the next delivery date
 */
export default async function orderSuccess(topic, shop, body) {

  const mytopic = "ORDER_SUCCESS";

  if (topic !== mytopic) {
    _logger.notice(`Recharge webhook ${topic} received but expected ${mytopic}`, { meta: { recharge: {} } });
    return false;
  };
  const topicLower = "order/success";

  const order = JSON.parse(body).order;

  writeFileForOrder(order, mytopic.toLowerCase().split("_")[1]);

  return false;

};
