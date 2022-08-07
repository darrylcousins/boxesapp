/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { makeRechargeQuery } from "../../lib/recharge/helpers.js";

export default async function subscriptionUpdated(topic, shop, body) {

  const mytopic = "SUBSCRIPTION_UPDATED";
  if (topic !== mytopic) {
    _logger.notice(`Recharge webhook ${topic} received but expected ${mytopic}`, { meta: { recharge: {} } });
    return;
  };
  const topicLower = topic.toLowerCase().replace(/_/g, "/");

  const subscription = JSON.parse(body).subscription;

  // make properties into easily accessible object
  const attributes = subscription.properties.reduce(
    (acc, curr) => Object.assign(acc, { [`${curr.name}`]: curr.value }),
    {});

  // We are looking for the next_charge_scheduled_at because the customer can
  // skip an order in the recharge customer interface and we need to update the
  // Delivery Date - also for any related subscribed and included items
  const nextChargeDate = new Date(Date.parse(subscription.next_charge_scheduled_at));
  let deliveryDate = new Date(Date.parse(attributes["Delivery Date"]));
  const currentDate = new Date(Date.parse(attributes["Delivery Date"]));

  // XXX Required that interval unit is weeks - this will break if set to days
  const days = parseInt(subscription.order_interval_frequency) * 7;
  while (deliveryDate < nextChargeDate) {
    deliveryDate.setDate(deliveryDate.getDate() + days);
  };

  if (currentDate.getTime() === deliveryDate.getTime()) {
    // date has not been changed
    return;
  };

  // We need to update this subscription
  attributes["Delivery Date"] = deliveryDate.toDateString();
  
  const properties = Object.entries(attributes).map(([name, value]) => {
    return { name, value };
  });

  const updateResult = await makeRechargeQuery({
    method: "PUT",
    path: `subscriptions/${subscription.id}`,
    body: JSON.stringify({ properties })
  });

  // Only log it if it is the container box all the other items will just update
  if (!Object.keys(attributes).includes("Including")) {
    return;
  };

  const meta = {
    recharge: {
      topic: topicLower,
      subscription_id: subscription.id,
      customer_id: subscription.customer_id,
      address_id: subscription.address_id,
      title: subscription.product_title,
      delivered: deliveryDate.toDateString(),
    }
  };
  
  _logger.notice(`Recharge webhook ${topicLower} received.`, { meta });
};

