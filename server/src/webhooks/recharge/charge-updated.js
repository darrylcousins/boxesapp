/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { ObjectID } from "mongodb";
import { sortObjectByKeys } from "../../lib/helpers.js";
import { reconcileGetGrouped } from "../../lib/recharge/reconcile-charge-group.js";
import { getMetaForCharge, writeFileForCharge } from "./helpers.js";

/* https://developer.rechargepayments.com/2021-11/webhooks_explained
 * 
 * The first time a charge is created (i.e. order through shopify) the
 * subscriptions do not have box_subscription_id set, the delivery date needs
 * to be updated. As does also the next charge date to sync with 3 days before
 * delivery
 *
 */
export default async function chargeUpdated(topic, shop, body) {

  const mytopic = "CHARGE_UPDATED";
  if (topic !== mytopic) {
    _logger.notice(`Recharge webhook ${topic} received but expected ${mytopic}`, { meta: { recharge: {} } });
    return;
  };
  const topicLower = topic.toLowerCase().replace(/_/g, "/");

  const charge = JSON.parse(body).charge;

  writeFileForCharge(charge, mytopic.toLowerCase().split("_")[1]);

  const meta = getMetaForCharge(charge, topicLower);

  let properties = {};
  let box_subscription_id = null;
  try {
    for (const line_item of charge.line_items) {

      const box_subscription_property = line_item.properties.find(el => el.name === "box_subscription_id");

      if (!box_subscription_property) {
        // should never happen because it should be set on charge/created
        // however that may still be processing - follow this
        meta.recharge = sortObjectByKeys(meta.recharge);
        _logger.notice(`Charge update: items box_subscription_id not found, exiting.`, { meta });
        return; // returns out of the method altogether
      };

      box_subscription_id = parseInt(box_subscription_property.value);

      // matching the box subscription
      if (line_item.purchase_item_id === box_subscription_id) {
        properties = line_item.properties.reduce(
          (acc, curr) => Object.assign(acc, { [`${curr.name}`]: curr.value === null ? "" : curr.value }),
          {});
      };
      delete properties["Likes"];
      delete properties["Dislikes"];
    };
  } catch(err) {
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };

  /*
   * Primarily for user editing of box, must prevent further edits until all
   * changes to subscriptions and charges have updated - hence using
   * mongodb.updates_pending to hold a "flag" object, see also subscription-updated
   */
  try {
    const query = {
      subscription_id: box_subscription_id,
      customer_id: charge.customer.id,
      address_id: charge.address_id,
      scheduled_at: charge.scheduled_at,
    };
    // all rc_subscription_ids are true for this query
    const updates_pending = await _mongodb.collection("updates_pending").findOne(query);
    // failing my query do the query match here
    if (updates_pending) {
      const allUpdated = updates_pending.rc_subscription_ids.every(el => {
        // check that all subscriptions have updated
        return el.updated === true && Number.isInteger(el.subscription_id);
      });
      if (allUpdated) {
        if (updates_pending.charge_id === charge.id) {
          meta.recharge.updates_pending = "COMPLETED";
          //await _mongodb.collection("updates_pending").deleteOne({ _id: ObjectID(updates_pending._id) });
        } else {
          meta.recharge.updates_pending = "CHARGE ID MISMATCH";
          /*
           * This should go then into charge-created??
          await _mongodb.collection("updates_pending").updatedOne(
            { _id: ObjectID(updates_pending._id) },
            { $set: { charge_id : charge.id } },
          );
          */
        };
      } else {
        meta.recharge.updates_pending = "PENDING COMPLETION";
      };
      const desired_rc_ids = [ ...updates_pending.rc_subscription_ids ];
      const rc_subscription_ids = meta.recharge.rc_subscription_ids;
      // more work required here - compare with charge rc_subscription_ids?

    } else {
      meta.recharge.updates_pending = "NOT FOUND";
    };

  } catch(err) {
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };

  meta.recharge = sortObjectByKeys(meta.recharge);
  _logger.notice(`Charge updated.`, { meta });

  //const grouped = reconcileGetGrouped({ charge });
  // {box, includes, charge, rc_shopify_ids}

};
