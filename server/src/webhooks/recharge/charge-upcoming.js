/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { gatherData, reconcileGetGrouped } from "../../lib/recharge/reconcile-charge-group.js";
import { updateSubscriptions } from "../../lib/recharge/helpers.js";
import chargeUpcomingMail from "../../mail/charge-upcoming.js";

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
  const meta = {
    recharge: {
      topic: topicLower,
      charge_id: charge.id,
      email: charge.customer.email,
    }
  };
  _logger.notice(`Recharge webhook ${topicLower} received.`, { meta });


  // First up we may assume that multiple boxes are present to find them we can
  // group the line_items by a common box_subscription_id
  const grouped = reconcileGetGrouped({ charge });

  let result = [];
  try {
    result = await gatherData({ grouped, result });

    // fix the subscriptions with the updated box
    for (const [idx, subscription] of result.entries()) {
      if (subscription.updates && subscription.updates.length) {

        await updateSubscriptions({ updates: subscription.updates });

        // update the includes to give the email the updated box items
        // remove the zerod items
        subscription.includes = subscription.updates.filter(el => el.quantity > 0);
        // add in the total price for each
        for (const included of subscription.includes) {
          const price = parseFloat(included.price) * included.quantity;
          included.total_price = `${price.toFixed(2)}`;
        };

        result[idx] = subscription;
      };

    };
    
    await chargeUpcomingMail({ subscriptions: result });

  } catch(err) {
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};

