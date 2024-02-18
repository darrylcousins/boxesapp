/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { sortObjectByKeys } from "../../lib/helpers.js";
import {
  getMetaForSubscription,
  writeFileForSubscription,
  updatePendingEntry,
} from "./helpers.js";

export default async function subscriptionDeleted(topic, shop, body, { io, sockets }) {

  const mytopic = "SUBSCRIPTION_DELETED";
  if (topic !== mytopic) {
    _logger.notice(`Recharge webhook ${topic} received but expected ${mytopic}`, { meta: { recharge: {} } });
    return;
  };
  const topicLower = topic.toLowerCase().replace(/_/g, "/");

  const subscription = JSON.parse(body).subscription;

  writeFileForSubscription(subscription, mytopic.toLowerCase().split("_")[1]);

  const meta = getMetaForSubscription(subscription, topicLower);

  try {

    // find the updates_pending document and set the update as completed i.e. updated: true
    const topic = "deleted";
    const { updated, entry } = await updatePendingEntry(meta, topic);
    if (updated) {
      // only logging on a completed update
      meta.recharge.update_label = entry.action;
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
  };

  return;
};

