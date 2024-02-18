/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { sortObjectByKeys } from "../../lib/helpers.js";
import {
  getMetaForSubscription,
  writeFileForSubscription,
  updatePendingEntry,
} from "./helpers.js";

export default async function subscriptionUpdated(topic, shop, body, { io, sockets }) {

  const mytopic = "SUBSCRIPTION_UPDATED";
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
    const topic = "updated";
    const { updated, entry } = await updatePendingEntry(meta, topic);
    if (updated) {

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
