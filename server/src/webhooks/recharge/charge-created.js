/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { gatherData, reconcileGetGrouped } from "../../lib/recharge/reconcile-charge-group.js";
import { updateSubscription, updateChargeDate, getSubscription } from "../../lib/recharge/helpers.js";
import subscriptionCreatedMail from "../../mail/subscription-created.js";
import fs from 'fs';

/* https://developer.rechargepayments.com/2021-11/webhooks_explained
 * 
 * The first time a charge is created (i.e. order through shopify) the
 * subscriptions do not have box_subscription_id set, the delivery date needs
 * to be updated. As does also the next charge date to sync with 3 days before
 * delivery
 *
 */
export default async function chargeCreated(topic, shop, body) {

  const mytopic = "CHARGE_CREATED";
  if (topic !== mytopic) {
    _logger.notice(`Recharge webhook ${topic} received but expected ${mytopic}`, { meta: { recharge: {} } });
    return;
  };
  let topicLower = topic.toLowerCase().replace(/_/g, "/");

  const charge = JSON.parse(body).charge;

  // Only process charges that have been successful
  // could use status=success
  //if ( !charge.processed_at) {
  if ( charge.status !== "success") {
    console.log("charge not processed so returning")
    return;
  };

  try {

    let parent = null; // hang on the box subscription for logging
    /* Collect values used when updating subscriptions */
    let deliveryDate;
    let currentDeliveryDate;
    let boxSubscriptionId;
    let nextChargeScheduledAt;
    let orderDayOfWeek;
    let subscription; // passed onto the email algorithm

    // loop line_items and find the parent box subscription and calculate new values
    for (const line_item of charge.line_items) {

      // exit if box_subscription_id is already set
      if (line_item.properties.some(el => el.name === "box_subscription_id")) {
        console.log("found subscription id so exiting");
        return;
      };

      if (line_item.properties.some(el => el.name === "Including")) {
        // get the subscription so as to access order_interval_frequency
        subscription = await getSubscription(line_item.purchase_item_id);
        boxSubscriptionId = subscription.id

        parent = { ...line_item }; // save parent line_item for logging
        const properties = [ ...parent.properties ];

        /*
         * Update the Delivery Date using "order_interval_frequency" and
         * "order_interval_unit": for us 1 weeks or 2 weeks Requiring
         * subscription to be made in "weeks" so as to be able to define
         * order_day_of_week if (subscription.order_interval_unit === "week") {
         * Note this will break if the user sets units to days, which should
         * not be possible
         */
        const days = parseInt(subscription.order_interval_frequency) * 7; // number of weeks by 7
        const dateItem = properties.find(el => el.name === "Delivery Date");
        currentDeliveryDate = dateItem.value;
        const dateObj = new Date(Date.parse(currentDeliveryDate));
        dateObj.setDate(dateObj.getDate() + days);
        deliveryDate = dateObj.toDateString();

        /* Match "order_day_of_week" to 3 days before "Delivery Date"
         * "normal" weekdays in javascript are numbered Sunday = 0 but recharges uses Monday = 0
         * This is because recharge uses python in the backend
         * So to get our 3 days we'll subtract 4 days
         */
        let currentIdx = dateObj.getDay() - 4; // 0 = Sunday, javascript style
        if (currentIdx < 0) currentIdx = currentIdx + 7; // fix to ensure the future
        orderDayOfWeek = currentIdx % 7;

        // with the delivery date we fix the next_charge_scheduled_at to 3 days prior
        const offset = dateObj.getTimezoneOffset()
        const nextChargeDate = new Date(dateObj.getTime() - (offset*60*1000));
        nextChargeDate.setDate(nextChargeDate.getDate() - 3);
        // Put to the required yyyy-mm-dd format
        // Could use .split("T")[0] instead of substring
        nextChargeScheduledAt = nextChargeDate.toISOString().substring(0,10);

        break;
      } else {
        continue;
      };
    };

    // used to compile the email
    const updatedLineItems = []; // update line items to match subscription updates

    // loop again to make updates to delivery date and next scheduled at
    for (const line_item of charge.line_items) {

      const properties = [ ...line_item.properties ];
      const dateItem = properties.find(el => el.name === "Delivery Date");
      const dateIdx = properties.indexOf(dateItem);
      dateItem.value = deliveryDate;
      properties[dateIdx] = dateItem;
      properties.push({ name: "box_subscription_id", value: boxSubscriptionId.toString() });
      line_item.properties = [ ...properties ];

      // update that parent object with new properties
      if (properties.some(el => el.name === "Including")) {
        parent.properties = [ ...properties ];
      };

      updatedLineItems.push(line_item);

      const updateData = {
        order_day_of_week: orderDayOfWeek, // assign orderDay
        properties: line_item.properties,
      };
      updateSubscription(line_item.purchase_item_id, updateData);
      updateChargeDate(line_item.purchase_item_id, nextChargeScheduledAt);

    };

    const updatedCharge = { ...charge };

    const updatedSubscription = { ...subscription };
    updatedSubscription.properties = [ ...parent.properties ];


    try {
      updatedCharge.scheduled_at = nextChargeScheduledAt;
      updatedCharge.line_items = updatedLineItems;
      updatedCharge.subscription = updatedSubscription;

      const grouped = reconcileGetGrouped({ charge: updatedCharge });
      grouped[parent.purchase_item_id].subscription = updatedSubscription; // pass subscription to avoid api call

      let result = [];
      result = await gatherData({ grouped, result });
      result[0].attributes.charge_id = null;

      let admin_email = _mongodb.collection("settings").findOne({handle: "admin-email"});
      if (admin_email) admin_email = admin_email.value;
      await subscriptionCreatedMail({ subscriptions: result, admin_email });

    } catch(err) {
      _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
    };

    const meta = {
      recharge: {
        topic: `${topicLower} via first order`,
        charge_id: charge.id,
        subscription_id: parent.purchase_item_id,
        customer_id: charge.customer.id,
        address_id: charge.address_id,
        shopify_order_id: charge.external_order_id.ecommerce,
        box: `${parent.title} - ${parent.variant_title}`,
        delivered: currentDeliveryDate,
        next_delivery: deliveryDate,
        email: charge.customer.email,
      }
    };

    _logger.notice(`Recharge webhook ${topicLower} received.`, { meta });

  } catch(err) {
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };


  try {
    fs.writeFileSync(`recharge.charge-${charge.id}.json`, JSON.stringify(charge, null, 2));
    //fs.writeFileSync(`recharge.charge-updated.json`, JSON.stringify(updatedCharge, null, 2));

  } catch(err) {
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
  return true;
};


