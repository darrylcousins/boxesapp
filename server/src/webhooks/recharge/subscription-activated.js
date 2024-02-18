/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { sortObjectByKeys } from "../../lib/helpers.js";
import { getMetaForSubscription, writeFileForSubscription } from "./helpers.js";

export default async function subscriptionActivated(topic, shop, body, { io, sockets }) {

  const mytopic = "SUBSCRIPTION_ACTIVATED";
  if (topic !== mytopic) {
    _logger.notice(`Recharge webhook ${topic} received but expected ${mytopic}`, { meta: { recharge: {} } });
    return;
  };
  const topicLower = topic.toLowerCase().replace(/_/g, "/");

  const subscription = JSON.parse(body).subscription;

  writeFileForSubscription(subscription, mytopic.toLowerCase().split("_")[1]);

  const meta = getMetaForSubscription(subscription, topicLower);

  // not updating updates_pending here because still have properties to update and next_scheduled_at
  // these updates are queued from api/recharge-reactivate-subscription
  try {
    meta.recharge = sortObjectByKeys(meta.recharge);

  } catch(err) {
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };

  return;
};


