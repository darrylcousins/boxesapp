/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

export default async function orderCreated(topic, shop, body) {

  const mytopic = "ORDER_CREATED";
  if (topic !== mytopic) {
    _logger.notice(`Recharge webhook ${topic} received but expected ${mytopic}`, { meta: { recharge: {} } });
    return;
  };

  const order = JSON.parse(body).order;

  const meta = {
    recharge: {
      topic: mytopic.toLowerCase().replace(/_/g, "/"),
      order_number: order.external_order_name.ecommerce,
      order_id: order.external_order_id.ecommerce,
      email: order.customer.email,
    }
  };
  _logger.notice(`Recharge webhook ${topic.toLowerCase().replace(/_/g, "/")} received.`, { meta });
};
