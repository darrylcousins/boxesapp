/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { ObjectId } from "mongodb";
import { sortObjectByKeys } from "../../lib/helpers.js";
import { findChangeMessages, getBoxesForCharge, getMetaForCharge, writeFileForCharge, getMetaForBox } from "./helpers.js";

/* https://developer.rechargepayments.com/2021-11/webhooks_explained
 * 
 * The first time a charge is created (i.e. order through shopify) the
 * subscriptions do not have box_subscription_id set, the delivery date needs
 * to be updated. As does also the next charge date to sync with 3 days before
 * delivery
 *
 * NOTE Returns false if no action is taken and true if some update occured
 *
 */
export default async function chargeUpdated(topic, shop, body, { io, sockets }) {

  const mytopic = "CHARGE_UPDATED";
  if (topic !== mytopic) {
    _logger.notice(`Recharge webhook ${topic} received but expected ${mytopic}`, { meta: { recharge: {} } });
    return false;
  };
  const topicLower = topic.toLowerCase().replace(/_/g, "/");

  const charge = JSON.parse(body).charge;

  if (charge.shipping_lines.length > 0 && charge.shipping_lines[0].code.includes("PENDING")) {
    _logger.notice(`Charge received but still pending`,
      { meta: { recharge: {charge_id: charge.id} } });
    return false;
  };

  writeFileForCharge(charge, mytopic.toLowerCase().split("_")[1]);

  // get the line_items not updated with a box_subscription_id property and sort into boxes
  // and a simple list of box subscription ids already updated with box_subscription_id
  const { box_subscriptions_possible, box_subscription_ids } = getBoxesForCharge(charge);

  /*
   * Primarily for user editing of box, must prevent further edits until all
   * changes to subscriptions and charges have updated - hence using
   * mongodb.updates_pending to hold a "flag" object, see also subscription/updated and charge/deleted
   */
  try {
    for (const box_subscription_id of box_subscription_ids) {
      const meta = getMetaForBox(box_subscription_id, charge, topicLower);
      const query = {
        subscription_id: parseInt(box_subscription_id),
        customer_id: parseInt(charge.customer.id),
        address_id: parseInt(charge.address_id),
      };

      /*
       * NOTE: When only the delivery schedule (e.g. 1 week to 2 weeks) is
       * changed then the charge is never updated and so does not come through
       * here, therefore a similar routine is performed on subscription
       * updated provided the updates_pending label indicates that only the
       * delivery schedule has changed.
       */

      const updates_pending = await _mongodb.collection("updates_pending").findOne(query);
      if (updates_pending) {

        // items with quantity set to zero will be removed on subscription/deleted
        // all rc_subscription_ids are true for this query
        const allUpdated = updates_pending.rc_subscription_ids.every(el => {
          // check that all subscriptions have updated or have been created
          return el.updated === true && Number.isInteger(el.subscription_id);
        });

        let countMatch = null;
        if (allUpdated) {
          // filter out the updates that were deleted items and have been
          // updated and will no longer be part of this charge
          const rc_ids_removed = updates_pending.rc_subscription_ids.filter(el => el.quantity > 0);
          countMatch = rc_ids_removed.length === meta.recharge.rc_subscription_ids.length;
          if (countMatch) {
            meta.recharge.update_label = updates_pending.action;
            meta.recharge.rc_subscription_ids = updates_pending.rc_subscription_ids;
            query.action = updates_pending.action;
            const messages = findChangeMessages(query);
            if (messages.length > 0) meta.recharge.change_messages = messages;

            meta.recharge = sortObjectByKeys(meta.recharge);

            // make log entry before removing so that it is available to get
            // charge_id from log when reactivating a subscription
            await _logger.notice(`Charge updated (${updates_pending.action}) for subscription.`, { meta });

            // safely and surely remove the entry, only other place is on charge/deleted
            // and in subscription/updated if only delivery schedule changed
            await _mongodb.collection("updates_pending").deleteOne({ _id: new ObjectId(updates_pending._id) });
            if (parseInt(process.env.DEBUG) === 1) {
              _logger.notice("Deleting updates pending entry charge/updated", { meta: { recharge: updates_pending }});
            };
          } else { // countMatch wrong
            if (parseInt(process.env.DEBUG) === 1) {
              meta.recharge.pending_subscription_ids = rc_ids_removed;
              _logger.notice("Charge updated, pending updates (not count match)", { meta });
            };
          };
        } else { // not all updated
          if (parseInt(process.env.DEBUG) === 1) {
            meta.recharge.pending_subscription_ids = updates_pending.rc_subscription_ids;
            _logger.notice("Charge updated, pending updates (not all updated)", { meta });
          };
        };

        // if all updates have completed then we can close the connection
        if (sockets && io && Object.hasOwnProperty.call(sockets, updates_pending.session_id)) {
          const socket_id = sockets[updates_pending.session_id];
          io = io.to(socket_id);
          if (allUpdated && countMatch) {
            io.emit("completed", `Updates completed, removing updates entry. subscription: ${updates_pending.subscription_id}`);
            io.emit("updates.completed", {
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
    return false;
  };

  return true;
};
