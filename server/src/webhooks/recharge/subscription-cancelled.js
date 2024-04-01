/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { ObjectId } from "mongodb";
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
export default async function subscriptionCancelled(topic, shop, body, { io, sockets }) {

  const mytopic = "SUBSCRIPTION_CANCELLED";
  if (topic !== mytopic) {
    _logger.notice(`Recharge webhook ${topic} received but expected ${mytopic}`, { meta: { recharge: {} } });
    return false;
  };
  const topicLower = topic.toLowerCase().replace(/_/g, "/");

  const subscription = JSON.parse(body).subscription;

  writeFileForSubscription(subscription, mytopic.toLowerCase().split("_")[1]);

  const meta = getMetaForSubscription(subscription, topicLower);

  try {

    // find the updates_pending document and set the update as completed i.e. updated: true
    const topic = "cancelled";
    const { updated, entry } = await updatePendingEntry(meta, topic);
    if (updated && entry) {
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

      // check that all have been updated
      const allUpdated = entry.rc_subscription_ids.every(el => {
        // check that all subscriptions have updated or have been created
        return el.updated === true && Number.isInteger(el.subscription_id);
      });
      if (allUpdated) {
        await _mongodb.collection("updates_pending").deleteOne({ _id: new ObjectId(entry._id) });
        if (parseInt(process.env.DEBUG) === 1) {
          _logger.notice(`Deleting pending entry ${topicLower} (${meta.recharge.title})`, { meta: { recharge: entry }});
        };
        if (sockets && io && Object.hasOwnProperty.call(sockets, entry.session_id)) {
          io.emit("completed", `Removing updates entry ${topicLower}.`);
          io.emit("completed", `Updates completed.`);
          io.emit("finished", {
            action: entry.action,
            session_id: entry.session_id,
            subscription_id: entry.subscription_id,
            address_id: entry.address_id,
            customer_id: entry.customer_id,
            scheduled_at: entry.scheduled_at,
            charge_id: entry.charge_id,
          });
        };
      } else {
        if (parseInt(process.env.DEBUG) === 1) {
          _logger.notice(`Updated ${meta.recharge.title} - entry still pending.`, { meta: { recharge: entry } });
        };
      };

    };

  } catch(err) {
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
    return false;
  };

  return true;
};


