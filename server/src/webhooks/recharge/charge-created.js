/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { gatherData, reconcileGetGrouped } from "../../lib/recharge/reconcile-charge-group.js";
import { sortObjectByKeys } from "../../lib/helpers.js";
import { updateSubscription, updateChargeDate, getSubscription } from "../../lib/recharge/helpers.js";
import subscriptionCreatedMail from "../../mail/subscription-created.js";
import { getMetaForCharge, writeFileForCharge } from "./helpers.js";

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
  const topicLower = topic.toLowerCase().replace(/_/g, "/");

  const charge = JSON.parse(body).charge;

  writeFileForCharge(charge, mytopic.toLowerCase().split("_")[1]);

  const meta = getMetaForCharge(charge, topicLower);

  /* 
   * Here look for updates_pending, has the charge been created because
   * scheduled_at has been changed. Status will still be queued.
   * If the match is correct then we can update the charge_id on the table
   */
  let box_subscription_id;
  for (const line_item of charge.line_items) {
    if (line_item.properties.some(el => el.name === "box_subscription_id")) {
      box_subscription_id = parseInt(line_item.properties.find(el => el.name === "box_subscription_id").value);
      break;
    };
  };
  if (box_subscription_id) {
    // do we have pending changes to resolve?
    try {
      const query = {
        subscription_id: box_subscription_id,
        customer_id: charge.customer.id,
        address_id: charge.address_id,
        scheduled_at: charge.scheduled_at,
      };
      // all rc_subscription_ids are true for this query
      const updates_pending = await _mongodb.collection("updates_pending").findOne(query);
      if (updates_pending) {
        const allUpdated = updates_pending.rc_subscription_ids.every(el => {
          // check that all subscriptions have updated or been created
          return el.updated === true && Number.isInteger(el.subscription_id);
        });
        if (allUpdated) {
          if (updates_pending.charge_id === charge.id) {
            meta.recharge.updates_pending = "COMPLETED";
            //await _mongodb.collection("updates_pending").deleteOne({ _id: ObjectID(updates_pending._id) });
          } else {
            meta.recharge.updates_pending = "CHARGE ID MISMATCH";
            /*
             * Should ok then to update the charge_id??
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
  };

  // Only process charges that have been successful
  // could use status=success
  //if ( !charge.processed_at) {
  if ( charge.status !== "success") {
    meta.recharge = { ...meta.recharge,
      topic: "charge/created",
    };
    meta.recharge = sortObjectByKeys(meta.recharge);
    _logger.notice(`Charge not processed ${topicLower}, exiting.`, { meta });
    return;
  };

  if (box_subscription_id) {
    // already set so don't need to continue below
    // update charge logging meta with the properties
    meta.recharge = { ...meta.recharge,
      topic: "charge/created",
      subscription_id: box_subscription_id,
    };
    const subscription_properties = line_item.properties.reduce(
      (acc, curr) => Object.assign(acc, { [`${curr.name}`]: curr.value === null ? "" : curr.value }),
      {});
    for (const [key, value] of Object.entries(subscription_properties)) {
      meta.recharge[key] = value;
    };
    meta.recharge = sortObjectByKeys(meta.recharge);
    _logger.notice(`Charge items box_subscription_id already set, exiting.`, { meta });
    return; // returns out of the method altogether
  };

  /* 
   * Above here we are looking a charges created because next_scheduled_at was updated
   * From here down for newly created subscriptions through shopfiy
   */

  try {

    let boxSubscription = null; // hang on the box subscription for logging
    /* Collect values used when updating subscriptions */
    let deliveryDate;
    let currentDeliveryDate;
    let boxSubscriptionId;
    let nextChargeScheduledAt;
    let orderDayOfWeek;
    let subscription; // passed onto the email algorithm

    // loop line_items and find the boxSubscription and calculate new values
    for (const line_item of charge.line_items) {

      if (line_item.properties.some(el => el.name === "Including")) {

        // the box subscription which joins all items together has been found

        // get the subscription so as to access order_interval_frequency
        subscription = await getSubscription(line_item.purchase_item_id);
        boxSubscriptionId = subscription.id

        boxSubscription = { ...line_item }; // save boxSubscription line_item for logging

        /*
         * Update the Delivery Date using "order_interval_frequency" and
         * "order_interval_unit": for us 1 weeks or 2 weeks Requiring
         * subscription to be made in "weeks" so as to be able to define
         * order_day_of_week if (subscription.order_interval_unit === "week") {
         * Note this will break if the user sets units to days, which should
         * not be possible
         */
        const days = parseInt(subscription.order_interval_frequency) * 7; // number of weeks by 7
        const dateItem = boxSubscription.properties.find(el => el.name === "Delivery Date");
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
        nextChargeScheduledAt = nextChargeDate.toISOString().split('T')[0];

        break;
      } else {
        continue;
      };
    };

    // used to compile the email
    const updatedLineItems = []; // update line items to match subscription updates
    const updates = [];

    // loop again to make updates to delivery date and next scheduled at
    for (const line_item of charge.line_items) {

      const properties = [ ...line_item.properties ];
      const dateItem = properties.find(el => el.name === "Delivery Date");
      const dateIdx = properties.indexOf(dateItem);
      dateItem.value = deliveryDate;
      properties[dateIdx] = dateItem;
      properties.push({ name: "box_subscription_id", value: boxSubscriptionId.toString() });
      line_item.properties = [ ...properties ];

      delete line_item.properties["Likes"];
      delete line_item.properties["Dislikes"];

      // update that boxSubscription object with new properties
      if (properties.some(el => el.name === "Including")) {
        boxSubscription.properties = [ ...properties ];
      };

      updatedLineItems.push(line_item);

      const updateData = {
        order_day_of_week: orderDayOfWeek, // assign orderDay
        properties: line_item.properties,
      };
      updates.push({
        id: line_item.purchase_item_id, 
        title: line_item.title, 
        body: updateData,
        date: nextChargeScheduledAt 
      });
    };

    for (const update of updates) {
      const opts = {
        id: update.id,
        title: update.title,
        body: update.body,
      };
      await updateSubscription(opts);
    };

    for (const update of updates) {
      const opts = {
        id: update.id,
        title: update.title,
        date: update.date,
      };
      await updateChargeDate(opts);
    };
    const updatedCharge = { ...charge };

    const updatedSubscription = { ...subscription };
    updatedSubscription.properties = [ ...boxSubscription.properties ];


    try {
      updatedCharge.scheduled_at = nextChargeScheduledAt;
      updatedCharge.line_items = updatedLineItems;
      updatedCharge.subscription = updatedSubscription;

      const grouped = reconcileGetGrouped({ charge: updatedCharge });
      grouped[boxSubscription.purchase_item_id].subscription = updatedSubscription; // pass subscription to avoid api call

      let result = [];
      result = await gatherData({ grouped, result });
      result[0].attributes.charge_id = null;

      let admin_email = _mongodb.collection("settings").findOne({handle: "admin-email"});
      if (admin_email) admin_email = admin_email.value;
      await subscriptionCreatedMail({ subscriptions: result, admin_email });

    } catch(err) {
      _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
    };

    /* verify that customer is in local mongodb */
    const collection = _mongodb.collection("customers");
    const doc = {
      first_name: charge.billing_address.first_name,
      last_name: charge.billing_address.last_name,
      email: charge.customer.email,
      recharge_id: parseInt(charge.customer.id),
      shopify_id: parseInt(charge.customer.external_customer_id.ecommerce),
    };
    const result = await _mongodb.collection("updates_pending").updateOne(
      { recharge_id: parseInt(charge.customer.id) },
      { "$set" : doc },
      { "upsert": true }
    );

    meta.recharge = { ...meta.recharge,
      topic: `subscription/created via first order`,
      subscription_id: boxSubscription.purchase_item_id,
      shopify_order_id: parseInt(charge.external_order_id.ecommerce),
      box: `${boxSubscription.title} - ${boxSubscription.variant_title}`,
      delivered: currentDeliveryDate,
      next_delivery: deliveryDate,
    };
    const props = updatedSubscription.properties.reduce(
      (acc, curr) => Object.assign(acc, { [`${curr.name}`]: curr.value === null ? "" : curr.value }),
      {});
    // update meta with updated values 
    for (const [key, value] of Object.entries(props)) {
      meta.recharge[key] = value;
    };

    meta.recharge = sortObjectByKeys(meta.recharge);
    _logger.notice(`Charge created, subsciptions updated, and email sent ${topicLower}.`, { meta });

  } catch(err) {
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };


  return true;
};


