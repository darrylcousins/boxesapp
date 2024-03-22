/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { sortObjectByKeys } from "../../lib/helpers.js";
import { getMetaForSubscription, writeFileForSubscription } from "./helpers.js";

/*
 * NOTE Returns false if no action is taken and true if some update occured
 *
 */
export default async function subscriptionActivated(topic, shop, body, { io, sockets }) {

  const mytopic = "SUBSCRIPTION_ACTIVATED";
  if (topic !== mytopic) {
    _logger.notice(`Recharge webhook ${topic} received but expected ${mytopic}`, { meta: { recharge: {} } });
    return false;
  };
  const topicLower = topic.toLowerCase().replace(/_/g, "/");

  const subscription = JSON.parse(body).subscription;

  writeFileForSubscription(subscription, mytopic.toLowerCase().split("_")[1]);

  if (parseInt(process.env.DEBUG) === 1) {
    const meta = getMetaForSubscription(subscription, topicLower);
    _logger.notice(`Activated ${meta.recharge.title}.`, { meta });
  };

  return false;
};


