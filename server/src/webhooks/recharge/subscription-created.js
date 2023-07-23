/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { sortObjectByKeys } from "../../lib/helpers.js";
import { getMetaForSubscription, writeFileForSubscription } from "./helpers.js";

export default async function subscriptionCreated(topic, shop, body) {

  const mytopic = "SUBSCRIPTION_CREATED";
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

  // if a new subscription from shopify then the properties won't yet have box_subscription_id
  // this is being set in the charge/created webhook where we have access to all line_items
  if (!Object.hasOwnProperty.call(properties, "box_subscription_id")) {
    // still log it but will be missing the box subscription so won't show up in customer logs
    meta.recharge = sortObjectByKeys(meta.recharge);
    _logger.notice(`Subscription created without box id. Exiting.`, { meta });
    return;
  };

  // find the updates_pending document and set the update as completed i.e. updated: true
  // could still test for quantity and properties,  but may not need to.
  try {
    const shopify_product_id = parseInt(subscription.external_product_id.ecommerce);
    const subscription_id = parseInt(subscription.id);
    const query = {
      subscription_id: parseInt(properties.box_subscription_id),
      customer_id: subscription.customer_id,
      address_id: subscription.address_id,
      scheduled_at: subscription.next_charge_scheduled_at,
      rc_subscription_ids:
        { $elemMatch: {
          $and: [
            { shopify_product_id },
            { subscription_id: null },
          ]},
        },
    };
    const update = { $set: {
      "rc_subscription_ids.$[i].updated": true,
      "rc_subscription_ids.$[i].subscription_id": subscription_id,
    }};
    const options = {
      arrayFilters: [
        {
          "i.shopify_product_id": shopify_product_id,
          "i.subscription_id": null,
        }
      ]
    };
    const res =  await _mongodb.collection("updates_pending").updateOne(query, update, options);
    if (res.matchedCount > 0) {
      query.rc_subscription_ids["$elemMatch"]["$and"][1] = { subscription_id: subscription.id };
      const entry = await _mongodb.collection("updates_pending").findOne(query);
      meta.recharge.label = entry.label;
      meta.recharge.updates_pending = "UPDATED ON CREATED";
    } else {
      meta.recharge.updates_pending = "NOT FOUND";
    };
  } catch(err) {
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };

  meta.recharge = sortObjectByKeys(meta.recharge);
  _logger.notice(`Subscription created.`, { meta });

};
