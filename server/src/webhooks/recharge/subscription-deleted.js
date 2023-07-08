/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { sortObjectByKeys } from "../../lib/helpers.js";
import { getMetaForSubscription, writeFileForSubscription } from "./helpers.js";

export default async function subscriptionDeleted(topic, shop, body) {

  const mytopic = "SUBSCRIPTION_DELETED";
  if (topic !== mytopic) {
    _logger.notice(`Recharge webhook ${topic} received but expected ${mytopic}`, { meta: { recharge: {} } });
    return;
  };
  const topicLower = topic.toLowerCase().replace(/_/g, "/");

  const subscription = JSON.parse(body).subscription;

  writeFileForSubscription(subscription, mytopic.toLowerCase().split("_")[1]);

  const meta = getMetaForSubscription(subscription, topicLower);

  const properties = subscription.properties.reduce(
    (acc, curr) => Object.assign(acc, { [`${curr.name}`]: curr.value === null ? "" : curr.value }),
    {});

  // find the updates_pending document and set the update as completed i.e. updated: true
  // could still test for quantity and properties,  but may not need to.
  try {
    const shopify_product_id = parseInt(subscription.external_product_id.ecommerce);
    const subscription_id = parseInt(subscription.id);
    // it appears that sometimes, but not always, the deleted subscription has next_charge_scheduled_at = null
    // so the query fails, so I've removed the scheduled_at row of query and added quantity: 0
    // I've got good confidence that this will still be robust enough
    const query = {
      subscription_id: parseInt(properties.box_subscription_id),
      customer_id: subscription.customer_id,
      address_id: subscription.address_id,
      //scheduled_at: subscription.next_charge_scheduled_at,
      rc_subscription_ids:
        { $elemMatch: {
          $and: [
            { shopify_product_id },
            { subscription_id },
            { quantity: 0 },
          ]},
        },
    };
    const update = { $set: {
      "rc_subscription_ids.$[i].updated": true,
    }};
    const options = {
      arrayFilters: [
        {
          "i.shopify_product_id": shopify_product_id,
          "i.subscription_id": subscription_id,
        }
      ]
    };
    const res =  await _mongodb.collection("updates_pending").updateOne(query, update, options);
    meta.recharge.updates_pending = (res.matchedCount > 0) ? "UPDATED ON REMOVE" : "NOT FOUND";
    meta.recharge = sortObjectByKeys(meta.recharge);
    _logger.notice(`Subscription deleted.`, { meta });

  } catch(err) {
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };

  return;
};

