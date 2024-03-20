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
export default async function subscriptionUpdated(topic, shop, body, { io, sockets }) {

  const mytopic = "SUBSCRIPTION_UPDATED";
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
    const topic = "updated";
    const { updated, entry } = await updatePendingEntry(meta, topic);
    if (updated) {

      if (sockets && io && Object.hasOwnProperty.call(sockets, entry.session_id)) {
        const socket_id = sockets[entry.session_id];
        io = io.to(socket_id);
        const variant_title = meta.recharge.variant_title ? ` (${meta.recharge.variant_title})` : "";
        io.emit("completed", `Subscription ${topic}: ${meta.recharge.title}${variant_title}`);
      };

      if (entry.action === "changed" && entry.schedule_only === true) {
        // check that all have been updated
        const allUpdated = entry.rc_subscription_ids.every(el => {
          // check that all subscriptions have updated or have been created
          return el.updated === true && Number.isInteger(el.subscription_id);
        });
        if (allUpdated) {
          console.log("=======================");
          console.log("Deleting updates pending entry subscription/updated");
          console.log("=======================");
          await _mongodb.collection("updates_pending").deleteOne({ _id: new ObjectId(entry._id) });
          if (parseInt(process.env.DEBUG) === 1) {
            _logger.notice("Deleting updates_pending entry subscription/updated", { meta: { recharge: entry }});
          };
          if (sockets && io && Object.hasOwnProperty.call(sockets, entry.session_id)) {
            io.emit("completed", `Updates completed, removing updates entry.`);
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
        };
      };
    };

  } catch(err) {
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
    return false;
  };

  return true;
};
