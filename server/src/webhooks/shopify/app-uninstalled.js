/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

export default async function appUninstalled(topic, shop, body) {

  const mytopic = "APP_UNINSTALLED";
  if (topic !== mytopic) {
    _logger.notice(`Recharge webhook ${topic} received but expected ${mytopic}`, { meta: { recharge: {} } });
    return;
  };

  const shops = await _mongodb.collection("shopify_sessions").deleteMany({shop});
  const webhooks = await _mongodb.collection("registry").deleteMany({service: "shopify"});

  const meta = {
    shopify: {
      topic: mytopic.toLowerCase().replace(/_/g, "/"),
      shop,
      deleted_shops: shops.deletedCount,
      deleted_webhooks: webhooks.deletedCount,
    }
  };
  _logger.notice(`Shop webhook ${topic.toLowerCase().replace(/_/g, "/")} received.`, { meta });

};

