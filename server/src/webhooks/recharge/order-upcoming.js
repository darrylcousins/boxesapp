/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

export default async function orderUpcoming(topic, shop, body) {

  const mytopic = "ORDER_UPCOMING";
  if (topic !== mytopic) {
    _logger.notice(`Recharge webhook ${topic} received but expected ${mytopic}`, { meta: { recharge: {} } });
    return;
  };

  const order = JSON.parse(body).order;
  const meta = {
    recharge: {
      topic: mytopic.toLowerCase().replace(/_/g, "/"),
      order_number: order.shopify_order_number,
      email: order.customer.email,
    }
  };
  _logger.notice(`Recharge webhook ${topic.toLowerCase().replace(/_/g, "/")} received.`, { meta });
};
