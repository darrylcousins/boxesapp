/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { ObjectID } from "mongodb";
import { sortObjectByKeys } from "../../lib/helpers.js";
import { reconcileGetGrouped } from "../../lib/recharge/reconcile-charge-group.js";
import { getBoxesForCharge, getMetaForCharge, writeFileForCharge, buildMetaForBox } from "./helpers.js";

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

  if (box_subscriptions_possible.length > 0) {
    // should never happen, by now all connected subscriptions should have
    // box_subscription_id property set - log it
    for (const item of box_subscriptions_possible) {
      // need to create new meta for each grouped items
      const tempCharge = { ...charge };
      // remove any line items not linked to this box subscription
      tempCharge.line_items =  item.line_items;
      meta = getMetaForCharge(tempCharge, "charge/updated");
      meta.recharge = sortObjectByKeys(meta.recharge);
      _logger.notice(`Error. Charge subscription not updated with box_subscription_id property.`, { meta });
    };

  };

  /*
   * Primarily for user editing of box, must prevent further edits until all
   * changes to subscriptions and charges have updated - hence using
   * mongodb.updates_pending to hold a "flag" object, see also subscription-updated
   */
  try {
    for (const box_subscription_id of box_subscription_ids) {
      meta = buildMetaForBox(box_subscription_id, charge);
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
        meta.recharge.label = updates_pending.label;
        const allUpdated = updates_pending.rc_subscription_ids.every(el => {
          // check that all subscriptions have updated
          return el.updated === true && Number.isInteger(el.subscription_id);
        });
        // filter out the updates that were deleted items
        const rc_ids_removed = updates_pending.rc_subscription_ids.filter(el => el.quantity > 0);
        //const countMatch = updates_pending.rc_subscription_ids.length === meta.recharge.rc_subscription_ids.length;
        const countMatch = rc_ids_removed.length === meta.recharge.rc_subscription_ids.length;
        if (allUpdated && countMatch) {
          if (updates_pending.charge_id === charge.id) {
            meta.recharge.updates_pending = "COMPLETED";
            _logger.info(`charge-updated completed`);
            await _mongodb.collection("updates_pending").deleteOne({ _id: ObjectID(updates_pending._id) });
          } else {
            // not receiving charge created webhook when updating scheduled_at so just trusting this
            // this is because when the charge exists, because of other
            // customer subscriptions then they are merged into existing charge
            const res = await _mongodb.collection("updates_pending").updateOne(
              { _id: ObjectID(updates_pending._id) },
              { $set: { charge_id : charge.id, updated_charge_date: true } },
            );
            _logger.info(`charge-updated charge id updated`);
            meta.recharge.updates_pending = "CHARGE ID UPDATED";
            // and it will be deleted at api/customer-charge
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

      meta.recharge = sortObjectByKeys(meta.recharge);
      _logger.notice(`Charge updated for subscription.`, { meta });

    };

  } catch(err) {
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };

  //const grouped = await reconcileGetGrouped({ charge });
  // {box, includes, charge, rc_shopify_ids}

};
