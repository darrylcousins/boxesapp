/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { ObjectId } from "mongodb";
import { gatherData, reconcileGetGrouped } from "../../lib/recharge/reconcile-charge-group.js";
import { updateSubscriptions } from "../../lib/recharge/helpers.js";
import { sortObjectByKeys } from "../../lib/helpers.js";
import chargeUpcomingMail from "../../mail/charge-upcoming.js";
import { groupedMetaForCharge, getMetaForBox, writeFileForCharge } from "./helpers.js";
import { upsertPending } from "../../api/recharge/lib.js";

/* https://developer.rechargepayments.com/2021-11/webhooks_explained
 * This will trigger X days before the upcoming charge is scheduled. The default
 * is 3 days but your store specific setting can be verified on the
 * Notification Settings page in the description of the Upcoming charge
 * customer notification.
 * 
 * So we need to compare the subscribed items to the box
 *
 * NOTE Returns false if no action is taken and true if some update occured
 *
 */
export default async function chargeUpcoming(topic, shop, body) {

  const mytopic = "CHARGE_UPCOMING";
  if (topic !== mytopic) {
    _logger.notice(`Recharge webhook ${topic} received but expected ${mytopic}`, { meta: { recharge: {} } });
    return false;
  };
  const topicLower = topic.toLowerCase().replace(/_/g, "/");

  const charge = JSON.parse(body).charge;

  writeFileForCharge(charge, mytopic.toLowerCase().split("_")[1]);

  // First up we may assume that multiple boxes are present to find them we can
  // group the line_items by a common box_subscription_id
  const grouped = await reconcileGetGrouped({ charge });

  let result = [];
  try {
    result = await gatherData({ grouped, result });

    let entries = [];
    for (const [idx, subscription] of result.entries()) {

      const meta = getMetaForBox(subscription.attributes.subscription_id, charge, topicLower);
      meta.recharge = sortObjectByKeys(meta.recharge); 

      if (!(subscription.updates && subscription.updates.length)) {

        _logger.notice(`Charge upcoming without updates.`, { meta });

      } else {

        // need to set data in updates_pending to prevent user from editing
        // subscription in this timeframe from updates
        const update_shopify_ids = subscription.updates.map(el => el.shopify_product_id);
        let updated;
        const rc_subscription_ids = subscription.attributes.rc_subscription_ids.map(el => {
          updated = update_shopify_ids.indexOf(el.shopify_product_id) === -1;
          return { ...el, updated };
        });
        const pendingData = {
          action: "upcoming",
          subscription_id: subscription.attributes.subscription_id,
          address_id: charge.address_id,
          customer_id: charge.customer.id,
          charge_id: charge.id,
          scheduled_at: charge.scheduled_at,
          title: subscription.attributes.title,
          variant: subscription.attributes.variant,
          rc_subscription_ids,
          deliver_at: subscription.attributes.nextDeliveryDate,
        };
        const entry_id = await upsertPending(pendingData);
        entries.push(new ObjectId(entry_id));
        // just to add to the logging, not required in the updates_pending table
        for (const [key, value] of Object.entries(subscription.properties)) {
          pendingData[key] = value;
        };
        pendingData.change_messages = subscription.messages;

        _logger.notice(`Charge upcoming updates required.`, { meta: { recharge: sortObjectByKeys(pendingData) } });

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
        //console.log(subscription.includes);
        subscription.includes[0].shopify_product_id = subscription.attributes.product_id;

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

      // update the box and freeze it from further editing
      const up = await _mongodb.collection("boxes").updateOne({
        delivered: subscription.attributes.nextDeliveryDate,
        shopify_product_id: subscription.attributes.product_id,
      },{
        "$set": { frozen: true }
      });
    };

    const mailOpts = {
      subscriptions: result,
      attributes: { ...result[0].attributes, address: charge.shipping_address }
    };
    if (entries.length === 0) {
      await chargeUpcomingMail(mailOpts);
    };

    let res;
    let timer;
    // only once all updates are complete do we send the email
    timer = setInterval(async () => {
      res = await _mongodb.collection("updates_pending").find({ "_id": { "$in": entries } }).toArray();
      if (res.length === 0) {
        clearInterval(timer);
        // compile data for email to customer the updates have been completed
        await chargeUpcomingMail(mailOpts);
      };
    }, 10000);


  } catch(err) {
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
    return false;
  };

  return true;
};

