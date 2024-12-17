/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { ObjectId } from "mongodb";
import { sortObjectByKeys, delay } from "../../lib/helpers.js";
import {
  findChangeMessages,
  getBoxesForCharge,
  getMetaForCharge,
  getMetaForBox,
  getMetaForSubscription,
  writeFileForCharge,
  writeFileForSubscription,
  updatePendingEntry,
} from "./helpers.js";

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

  try {
    /* NOTE Special here for cancelled and reactivated???
     * I found that after I started updating dates, status, and properties all
     * in one then the charge will be fully formed and complete before the
      * subscription/updated webhooks come through
     */
    const meta = { recharge: { // base construct for meta
      customer_id: charge.customer.id,
      address_id: charge.address_id,
    }};
    const actions = {};
    for (const boxId of box_subscription_ids) {
      actions[boxId] = null;
      const query = { ...meta.recharge, subscription_id: boxId };
      const entry = await _mongodb.collection("updates_pending").findOne(query);
      if (entry) actions[boxId] = entry.action;
    };
    // ensure the box subscription is the last to be processed
    for(var x in charge.line_items) charge.line_items[x].properties.some(el => el.name === "Including") 
      ? charge.line_items.push(charge.line_items.splice(x,1)[0]) : 0;
    for (const line_item of charge.line_items) {
      if (line_item.properties.some(el => el.name === "box_subscription_id")) {
        // build meta from line_item
        meta.recharge.scheduled_at = charge.scheduled_at;
        meta.recharge.title = line_item.title;
        meta.recharge.variant_title = line_item.variant_title;
        meta.recharge.quantity = line_item.quantity;
        meta.recharge.item_subscription_id = line_item.purchase_item_id;
        meta.recharge.shopify_product_id = parseInt(line_item.external_product_id.ecommerce);
        meta.recharge.subscription_id = parseInt(line_item.properties.find(el => el.name === "box_subscription_id").value);
        meta.recharge["Delivery Date"] = line_item.properties.find(el => el.name === "Delivery Date").value;
        const action = (Object.hasOwn(actions, meta.recharge.subscription_id)) ? actions[meta.recharge.subscription_id] : "updated";
        if (false) { // NOTE wait and see if subscriptions do it all
          const { updated, entry } = await updatePendingEntry(meta, action, io, sockets);
          if (updated) {

            if (sockets && io && Object.hasOwnProperty.call(sockets, entry.session_id)) {
              const socket_id = sockets[entry.session_id];
              io = io.to(socket_id);
              const variant_title = meta.recharge.variant_title ? ` (${meta.recharge.variant_title})` : "";
              io.emit("completed", `Subscription ${action}: ${meta.recharge.title}${variant_title}`);
            };

            // check that all have been updated
            const allUpdated = entry.rc_subscription_ids.every(el => {
              // check that all subscriptions have updated or have been created
              return el.updated === true && Number.isInteger(el.subscription_id);
            });
            if (allUpdated) {
              delay(40000); // wait to allow the subscriptions ot update
              await _mongodb.collection("updates_pending").deleteOne({ _id: new ObjectId(entry._id) });
              if (parseInt(process.env.DEBUG) === 1) {
                _logger.notice(`Deleting updates pending entry ${topicLower} (${action})`, { meta: { recharge: entry }});
              };
              if (sockets && io && Object.hasOwnProperty.call(sockets, entry.session_id)) {
                io.emit("completed", `Removing updates entry ${topicLower} (${action}).`);
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
              return false;
            };
          };
        };
      };
    };
  } catch(err) {
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
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
              _logger.notice(`Deleting updates pending entry ${topicLower} (${updates_pending.action})`, { meta: { recharge: updates_pending }});
            };
          };
        };

        // if all updates have completed then we can close the connection
        if (sockets && io && Object.hasOwnProperty.call(sockets, updates_pending.session_id)) {
          const socket_id = sockets[updates_pending.session_id];
          io = io.to(socket_id);
          if (allUpdated && countMatch) {
            io.emit("completed", `Removing updates entry ${topicLower}.`);
            io.emit("completed", `Updates completed.`);
            const message = updates_pending.action === "created" ? "created.complete" : "finished";
            io.emit(message, {
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
