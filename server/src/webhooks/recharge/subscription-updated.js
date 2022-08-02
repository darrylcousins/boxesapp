/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

export default async function subscriptionUpdated(topic, shop, body) {

  const mytopic = "SUBSCRIPTION_UPDATED";
  if (topic !== mytopic) {
    _logger.notice(`Recharge webhook ${topic} received but expected ${mytopic}`, { meta: { recharge: {} } });
    return;
  };

  const subscription = JSON.parse(body).subscription;
  console.log("SUBSCRIPTION =============================== Updated");
  //console.log(subscription);

  const meta = {
    recharge: {
      topic: mytopic.toLowerCase().replace(/_/g, "/"),
      subscription_id: subscription.id,
      customer_id: subscription.customer_id,
      address_id: subscription.address_id,
      title: subscription.product_title,
    }
  };
  _logger.notice(`Recharge webhook ${topic.toLowerCase().replace(/_/g, "/")} received.`, { meta });
};

