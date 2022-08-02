/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

export default async function chargeCreated(topic, shop, body) {

  const mytopic = "CHARGE_CREATED";
  if (topic !== mytopic) {
    _logger.notice(`Recharge webhook ${topic} received but expected ${mytopic}`, { meta: { recharge: {} } });
    return;
  };

  const charge = JSON.parse(body).charge;

  const meta = {
    recharge: {
      topic: mytopic.toLowerCase().replace(/_/g, "/"),
      charge_id: charge.id,
      email: charge.customer.email,
    }
  };
  _logger.notice(`Recharge webhook ${topic.toLowerCase().replace(/_/g, "/")} received.`, { meta });

};
