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

        // XXX need to set data in updates_pending to prevent user from editing subscription in this timeframe
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
    
    let admin_email = _mongodb.collection("settings").findOne({handle: "admin-email"});
    if (admin_email) admin_email = admin_email.value;
    await chargeUpcomingMail({ subscriptions: result, admin_email });

  } catch(err) {
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };

  return true;
};

