/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

/* No longer required - but keep in mind if we can allow admin to create subscription boxes? */
export default async function subscriptionCreated(topic, shop, body) {

  const mytopic = "SUBSCRIPTION_CREATED";
  if (topic !== mytopic) {
    _logger.notice(`Recharge webhook ${topic} received but expected ${mytopic}`, { meta: { recharge: {} } });
    return;
  };
  const topicLower = topic.toLowerCase().replace(/_/g, "/");

  return;
};
