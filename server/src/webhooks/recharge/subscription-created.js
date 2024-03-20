/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { sortObjectByKeys } from "../../lib/helpers.js";
import {
  getMetaForSubscription,
  writeFileForSubscription,
  updatePendingEntry,
} from "./helpers.js";

/*
 * NOTE Returns false if no action is taken and true if some update occured
 *
 */
export default async function subscriptionCreated(topic, shop, body, { io, sockets }) {

  const mytopic = "SUBSCRIPTION_CREATED";
  if (topic !== mytopic) {
    _logger.notice(`Recharge webhook ${topic} received but expected ${mytopic}`, { meta: { recharge: {} } });
    return false;
  };
  const topicLower = topic.toLowerCase().replace(/_/g, "/");

  const subscription = JSON.parse(body).subscription;

  writeFileForSubscription(subscription, mytopic.toLowerCase().split("_")[1]);

  const meta = getMetaForSubscription(subscription, topicLower);

  // if a new subscription from shopify then the properties won't yet have box_subscription_id
  // this is being set in the charge/created webhook where we have access to all line_items
  if (!Object.hasOwnProperty.call(meta.recharge, "subscription_id")) {
    return false;
  };

  try {

    // find the updates_pending document and set the update as completed i.e. updated: true
    const topic = "created";
    const { updated, entry } = await updatePendingEntry(meta, topic);

    if (updated) {
      // only logging on a completed update
      meta.recharge.update_label = entry.label;
      meta.recharge.updates_pending = `UPDATED ON ${topic.toUpperCase()}`;
      meta.recharge = sortObjectByKeys(meta.recharge);

      if (sockets && io && Object.hasOwnProperty.call(sockets, entry.session_id)) {
        const socket_id = sockets[entry.session_id];
        io = io.to(socket_id);
        const variant_title = meta.recharge.variant_title ? ` (${meta.recharge.variant_title})` : "";
        io.emit("completed", `Subscription ${topic}: ${meta.recharge.title}${variant_title}`);
      };

    };

  } catch(err) {
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
    return false;
  };

  return true;
};
