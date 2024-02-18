/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { ObjectId } from "mongodb";
import { sortObjectByKeys } from "../../lib/helpers.js";
import { getBoxesForCharge, getMetaForCharge, writeFileForCharge, getMetaForBox } from "./helpers.js";

/* https://developer.rechargepayments.com/2021-11/webhooks_explained
 * 
 * The first time a charge is created (i.e. order through shopify) the
 * subscriptions do not have box_subscription_id set, the delivery date needs
 * to be updated. As does also the next charge date to sync with 3 days before
 * delivery
 *
 */
export default async function chargeUpdated(topic, shop, body, { io, sockets }) {

  const mytopic = "CHARGE_UPDATED";
  if (topic !== mytopic) {
    _logger.notice(`Recharge webhook ${topic} received but expected ${mytopic}`, { meta: { recharge: {} } });
    return;
  };
  const topicLower = topic.toLowerCase().replace(/_/g, "/");

  const charge = JSON.parse(body).charge;

  if (charge.shipping_lines.length > 0 && charge.shipping_lines[0].code.includes("PENDING")) {
    _logger.notice(`Charge received but still pending`,
      { meta: { recharge: {charge_id: charge.id} } });
    return;
  };

  writeFileForCharge(charge, mytopic.toLowerCase().split("_")[1]);

  let meta = getMetaForCharge(charge, topicLower);

  // get the line_items not updated with a box_subscription_id property and sort into boxes
  // and a simple list of box subscription ids already updated with box_subscription_id
  const { box_subscriptions_possible, box_subscription_ids } = getBoxesForCharge(charge);

  /*
   * Primarily for user editing of box, must prevent further edits until all
   * changes to subscriptions and charges have updated - hence using
   * mongodb.updates_pending to hold a "flag" object, see also subscription/updated
   */
  try {
    for (const box_subscription_id of box_subscription_ids) {
      meta = getMetaForBox(box_subscription_id, charge, topicLower);
      const query = {
        subscription_id: parseInt(box_subscription_id),
        customer_id: parseInt(charge.customer.id),
        address_id: parseInt(charge.address_id),
        scheduled_at: charge.scheduled_at, // must match the target date
        deliver_at: meta.recharge["Delivery Date"],
      };

      // all rc_subscription_ids are true for this query
      const updates_pending = await _mongodb.collection("updates_pending").findOne(query);
      // failing my query do the query match here
      if (updates_pending) {

        // items with quantity set to zero will be removed on subscription/deleted
        const allUpdated = updates_pending.rc_subscription_ids.every(el => {
          // check that all subscriptions have updated or have been created
          return el.updated === true && Number.isInteger(el.subscription_id);
        });

        let countMatch = null;
        if (allUpdated) {
          // filter out the updates that were deleted items and have been updated
          const rc_ids_removed = updates_pending.rc_subscription_ids.filter(el => el.quantity > 0);
          countMatch = rc_ids_removed.length === meta.recharge.rc_subscription_ids.length;
          if (countMatch) {
            meta.recharge.update_label = updates_pending.action;

            if (updates_pending.action === "update" || updates_pending.action === "reconcile") {
              // try to get the change_messags to add to the log
              const logQuery = {};
              logQuery[`meta.recharge.customer_id`] = query.customer_id;
              logQuery[`meta.recharge.subscription_id`] = query.subscription_id;
              logQuery[`meta.recharge.address_id`] = query.address_id;
              logQuery[`meta.recharge.scheduled_at`] = query.scheduled_at;
              logQuery[`meta.recharge.label`] = updates_pending.action;
              // get the most recent and one only
              const result = await _mongodb.collection("logs").find(logQuery).sort({ timestamp: -1 }).limit(1).toArray();
              if (result.length > 0) {
                console.log("found a log entry", result[0].meta.change_messages);
                meta.recharge.change_messages = result[0].meta.change_messages;
              } else {
                console.log("Didn't find log entry", logQuery);
              };
            };

            // make log entry before removing so that it is available to get
            // charge_id from log when reactivating a subscription
            meta.recharge = sortObjectByKeys(meta.recharge);
            // this is the only place I've used await for logger notice
            await _logger.notice(`Charge ${updates_pending.action} for subscription.`, { meta });

            // safely and surely remove the entry, only other place is on charge/deleted
            console.log("=======================");
            console.log("Deleting updates pending enty");
            console.log("=======================");
            await _mongodb.collection("updates_pending").deleteOne({ _id: new ObjectId(updates_pending._id) });

          };
        };

        // if all updates have completed then we can close the connection
        if (sockets && io && Object.hasOwnProperty.call(sockets, updates_pending.session_id)) {
          const socket_id = sockets[updates_pending.session_id];
          io = io.to(socket_id);
          if (allUpdated && countMatch) {
            io.emit("completed", `Updates completed, removing updates entry. ChargeID: ${charge.id}`);
            io.emit("finished", {
              action: updates_pending.action,
              session_id: updates_pending.session_id,
              subscription_id: updates_pending.subscription_id,
              address_id: updates_pending.address_id,
              customer_id: updates_pending.customer_id,
              scheduled_at: updates_pending.scheduled_at,
              charge_id: charge.id,
            });
          } else {
            io.emit("message", "Charge updated: pending updates");
          };
        };

      };

    };

  } catch(err) {
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };

};
