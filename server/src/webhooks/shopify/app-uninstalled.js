/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { makeRechargeQuery } from "../../lib/recharge/helpers.js";
import { sortObjectByKeys } from "../../lib/helpers.js";

export default async function appUninstalled(topic, shop, body) {

  const mytopic = "APP_UNINSTALLED";
  if (topic !== mytopic) {
    _logger.notice(`Recharge webhook ${topic} received but expected ${mytopic}`, { meta: { recharge: {} } });
    return;
  };

  const rechargeIds = await _mongodb.collection("registry").find({service: "recharge"}).toArray();
  const shops = await _mongodb.collection("shopify_sessions").deleteMany({shop});
  // delete all registered webhooks
  const webhooks = await _mongodb.collection("registry").deleteMany({});
  // also now delete the webhooks from recharge
  for (const id of rechargeIds.map(el => el.webhook_id)) {
    const deleteResult = await makeRechargeQuery({
      method: "DELETE",
      path: `webhooks/${id}`,
    });
  };

  const meta = {
    shopify: {
      topic: mytopic.toLowerCase().replace(/_/g, "/"),
      shop,
      deleted_shops: shops.deletedCount,
      deleted_webhooks: webhooks.deletedCount,
      deleted_recharge: rechargeIds.length,
    }
  };
  meta.shopify = sortObjectByKeys(meta.shopify);
  _logger.notice(`Shop webhook ${topic.toLowerCase().replace(/_/g, "/")} received.`, { meta });
  return true;
};

