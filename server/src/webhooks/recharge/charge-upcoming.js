/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { gatherData, reconcileGetGrouped } from "../../lib/recharge/reconcile-charge-group.js";
import { updateSubscriptions } from "../../lib/recharge/helpers.js";
import { sortObjectByKeys } from "../../lib/helpers.js";
import chargeUpcomingMail from "../../mail/charge-upcoming.js";
import { getMetaForCharge, writeFileForCharge } from "./helpers.js";

/* https://developer.rechargepayments.com/2021-11/webhooks_explained
 * This will trigger X days before the upcoming charge is scheduled. The default
 * is 3 days but your store specific setting can be verified on the
 * Notification Settings page in the description of the Upcoming charge
 * customer notification.
 * 
 * So we need to compare the subscribed items to the box
 */
export default async function chargeUpcoming(topic, shop, body) {

  const mytopic = "CHARGE_UPCOMING";
  if (topic !== mytopic) {
    _logger.notice(`Recharge webhook ${topic} received but expected ${mytopic}`, { meta: { recharge: {} } });
    return;
  };
  const topicLower = topic.toLowerCase().replace(/_/g, "/");

  const charge = JSON.parse(body).charge;

  writeFileForCharge(charge, mytopic.toLowerCase().split("_")[1]);

  const meta = getMetaForCharge(charge, topicLower);

  meta.recharge = sortObjectByKeys(meta.recharge);

  _logger.notice(`Charge upcoming.`, { meta });

  // First up we may assume that multiple boxes are present to find them we can
  // group the line_items by a common box_subscription_id
  const grouped = await reconcileGetGrouped({ charge });

  let result = [];
  try {
    result = await gatherData({ grouped, result });

    for (const [idx, subscription] of result.entries()) {
      if (subscription.updates && subscription.updates.length) {

        // need to set data in updates_pending to prevent user from editing
        // subscription in this timeframe from updates and figure the
        // deletions?
        const update_shopify_ids = subscription.updates.map(el => el.shopify_product_id);
        let updated;
        const rc_subscription_ids = subscription.attributes.rc_subscription_ids.map(el => {
          updated = update_shopify_ids.indexOf(el.shopify_product_id) === -1;
          return { ...el, updated };
        });
        const boxSubscription = subscription.updates.find(el => el.properties.some(e => e.name === "Including"));
        // save this for later because it is lost on updates
        const box_shopify_id = parseInt(boxSubscription.shopify_product_id);
        const props = boxSubscription.properties.reduce(
          (acc, curr) => Object.assign(acc, { [`${curr.name}`]: curr.value === null ? "" : curr.value }),
          {});
        const doc= {
          subscription_id: boxSubscription.subscription_id,
          address_id: meta.recharge.address_id,
          customer_id: meta.recharge.customer_id,
          charge_id: meta.recharge.charge_id,
          scheduled_at: meta.recharge.scheduled_at,
          title: meta.recharge.title,
          label: `CHARGE-UPCOMING-UPDATE`,
          rc_subscription_ids,
          timestamp: new Date(),
        };
        for (const [key, value] of Object.entries(props)) {
          doc[key] = value;
        };
        // set up the pending flag
        await _mongodb.collection("updates_pending").updateOne(
          { charge_id: meta.recharge.charge_id },
          { "$set" : doc },
          { "upsert": true }
        );
        _logger.notice(`Recharge charge upcoming updates.`, { meta: { recharge: doc } });

        // Reconcile the items in the subscription with the new box
        await updateSubscriptions({ updates: subscription.updates });

        // Fix up the lists for the charge upcoming email

        // flatten lists for easy filtering
        const includes = subscription.includes.map(el => el.subscription_id);
        const updates = subscription.updates.map(el => el.subscription_id);

        // filter out the zero'd items
        let keepers = subscription.updates.filter(el => el.quantity > 0).map(el => el.subscription_id);
        // get the unchanged items from original includes
        let stayers = includes.filter(el => !updates.includes(el));

        keepers = subscription.updates.filter(el => keepers.includes(el.subscription_id));
        stayers = subscription.includes.filter(el => stayers.includes(el.subscription_id));

        subscription.includes = stayers.concat(keepers);
        // ensure the box subscription is the first to create a new charge
        for(var x in subscription.includes) subscription.includes[x].properties.some(el => el.name === "Including")
          ? subscription.includes.unshift(subscription.includes.splice(x,1)[0])
          : 0;
        // now the first update the shopify id
        subscription.includes[0].shopify_product_id = box_shopify_id;

        // add in the total price for each
        for (const included of subscription.includes) {
          const price = parseFloat(included.price) * included.quantity;
          included.total_price = `${price.toFixed(2)}`;
        };
        const totalPrice = subscription.includes
          .map(el => parseFloat(el.price) * el.quantity)
          .reduce((sum, el) => sum + el, 0);
        subscription.attributes.totalPrice = `${totalPrice.toFixed(2)}`;

        result[idx] = subscription;
      };

    };

    await chargeUpcomingMail({ subscriptions: result });

  } catch(err) {
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };

  return true;
};

