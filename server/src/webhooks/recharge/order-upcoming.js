/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { writeFileForOrder } from "./helpers.js";

/* https://developer.rechargepayments.com/2021-11/webhooks_explained
 * 
 * An order has been created from the charge
 * We need to update all subscriptions to the next delivery date
 *
 * NOTE Returns false if no action is taken and true if some update occured
 *
 */
export default async function orderUpcoming(topic, shop, body) {

  const mytopic = "ORDER_UPCOMING";

  if (topic !== mytopic) {
    _logger.notice(`Recharge webhook ${topic} received but expected ${mytopic}`, { meta: { recharge: {} } });
    return false;
  };
  const topicLower = "order/upcoming";

  const order = JSON.parse(body).order;

  writeFileForOrder(order, mytopic.toLowerCase().split("_")[1]);

  return false;
};



