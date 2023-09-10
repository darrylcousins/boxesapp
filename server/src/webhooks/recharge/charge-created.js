/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { ObjectID } from "mongodb";
import { gatherData, reconcileGetGrouped } from "../../lib/recharge/reconcile-charge-group.js";
import { formatDate, sortObjectByKeys, matchNumberedString } from "../../lib/helpers.js";
import { updateSubscription, updateChargeDate, getSubscription } from "../../lib/recharge/helpers.js";
import subscriptionCreatedMail from "../../mail/subscription-created.js";
import { getBoxesForCharge, getMetaForCharge, writeFileForCharge, buildMetaForBox, itemStringToList  } from "./helpers.js";

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

  let meta;

  /* 
   * Here look for updates_pending, has the charge been created because
   * scheduled_at has been changed. Status will still be queued.
   * If the match is correct then we can update the charge_id on the table
   * may be more that one box_subscription on a charge created ie merged with existing charge
   */

  // hold a list of box subscription centred meta data for logging ie hold subscription_id for a box
  let listOfMeta = [];

  // get the line_items not updated with a box_subscription_id property and sort into boxes
  // and a simple list of box subscription ids already updated with box_subscription_id
  const { box_subscriptions_possible, box_subscription_ids } = getBoxesForCharge(charge);

  if (box_subscription_ids.length > 0) {
    // do we have pending changes to resolve?
    try {
      for (const id of box_subscription_ids) {
        // need to create new meta for each grouped items
        meta = buildMetaForBox(id, charge);
        const query = {
          subscription_id: id,
          customer_id: charge.customer.id,
          address_id: charge.address_id,
          scheduled_at: charge.scheduled_at,
        };
        // all rc_subscription_ids are true for this query
        const updates_pending = await _mongodb.collection("updates_pending").findOne(query);
        if (updates_pending) {
          meta.recharge.label = updates_pending.label;
          const allUpdated = updates_pending.rc_subscription_ids.every(el => {
            // check that all subscriptions have updated or been created
            return el.updated === true && Number.isInteger(el.subscription_id);
          });
          // filter out the updates that were deleted items
          const rc_ids_removed = updates_pending.rc_subscription_ids.filter(el => el.quantity > 0);
          //const countMatch = updates_pending.rc_subscription_ids.length === meta.recharge.rc_subscription_ids.length;
          const countMatch = rc_ids_removed.length === meta.recharge.rc_subscription_ids.length;
          if (allUpdated && countMatch) {
            if (updates_pending.charge_id === charge.id) {
              meta.recharge.updates_pending = "COMPLETED";
            } else { // if label === CHARGE_DATE?
              // Should ok then to update the charge_id??
              const res = await _mongodb.collection("updates_pending").updateOne(
                { _id: ObjectID(updates_pending._id) },
                { $set: { charge_id : charge.id, updated_charge_date: true } },
              );
              _logger.info(`charge-created updating charge id`);
              meta.recharge.updates_pending = "UPDATING CHARGE ID";
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
        listOfMeta.push(meta);
      };
    } catch(err) {
      _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
    };
  };

  // Only process charges that have been successful
  // could use status=success
  //if ( !charge.processed_at) {
  if ( charge.status !== "success") {
    // similarly must make different log for mulitple charges
    // once through for box_subscription_ids and secondly for line_items
    for (const id of box_subscription_ids) {
      // find meta
      meta = listOfMeta.find(el => el.recharge.subscription_id === id);

      if (meta && meta.recharge) {
        meta.recharge = sortObjectByKeys(meta.recharge);
        _logger.notice(`Charge not processed ${topicLower}, exiting.`, { meta });
      } else {
        _logger.notice(`Charge not processed ${topicLower}, exiting.`, {
          meta: { recharge: { charge_id: charge.id, subscription_id: id } } 
        });
      };
    };
    for (const item of box_subscriptions_possible) {
      // need to create new meta for each grouped items
      const tempCharge = { ...charge };
      // remove any line items not linked to this box subscription
      tempCharge.line_items =  item.line_items;
      meta = getMetaForCharge(tempCharge, "charge/created");
      meta.recharge = sortObjectByKeys(meta.recharge);
      _logger.notice(`Charge not processed ${topicLower}, exiting.`, { meta });
    };
    return;
  };

  // items are udated already, logging only
  if (box_subscription_ids.length > 0) {
    for (const id of box_subscription_ids) {
      // need to create new meta for each grouped items
      meta = buildMetaForBox(id, charge);
      meta.recharge = sortObjectByKeys(meta.recharge);
      _logger.notice(`Charge items box_subscription_id already set, exiting.`, { meta });
    };

    // nothing further to process if this empty
    if (box_subscriptions_possible.length === 0) {
      return; // returns out of the method altogether after logging each subscription
    };
  };

  /* 
   * Above here we are looking a charges created because next_scheduled_at was updated
   * From here down for newly created subscriptions through shopfiy
   * So again we need to create a flag entry in updates_pending
   */
  try {

    // The worst case would be if two box subscriptions came in with the same title and
    // I have no way to distinguish them from the other
    // box_subscriptions_possible.length should only ever one, but I'll loop regardless,
    //

    let boxSubscription; // hang on the box subscription for logging
    /* Collect values used when updating subscriptions */
    let deliveryDate;
    let currentDeliveryDate;
    let boxSubscriptionId;
    let nextChargeScheduledAt;
    let orderDayOfWeek;
    let subscription; // passed onto the email algorithm

    for (const box_item of box_subscriptions_possible) {

      // the box subscription which joins all items together has been found
      boxSubscriptionId = box_item.subscription_id;

      // save boxSubscription line_item for logging
      boxSubscription = box_item.line_items.find(el => el.purchase_item_id === boxSubscriptionId);

      // get the subscription so as to access order_interval_frequency
      subscription = await getSubscription(boxSubscriptionId, box_item.title);

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
      //const offset = dateObj.getTimezoneOffset()
      //const nextChargeDate = new Date(dateObj.getTime() - (offset*60*1000));
      const nextChargeDate = new Date(Date.parse(deliveryDate));
      nextChargeDate.setDate(nextChargeDate.getDate() - 3);
      // Put to the required yyyy-mm-dd format
      // Could use .split("T")[0] instead of substring
      //nextChargeScheduledAt = nextChargeDate.toISOString().split('T')[0];
      nextChargeScheduledAt = formatDate(nextChargeDate);

      // used to compile the email
      const updatedLineItems = []; // update line items to match subscription updates
      const updates = [];

      // loop again to make updates to delivery date and next scheduled at
      for (const line_item of box_item.line_items) {

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

      // create a mock charge including only these items
      const updatedCharge = { ...charge };

      const line_item_ids = updates.map(el => el.id);
      // remove any line items not linked to this box subscription
      updatedCharge.line_items =  charge.line_items.filter(el => {
        return line_item_ids.includes(el.purchase_item_id);
      });

      const updatedSubscription = { ...subscription };
      updatedSubscription.properties = [ ...boxSubscription.properties ];
      try {
        updatedCharge.scheduled_at = nextChargeScheduledAt;
        updatedCharge.line_items = updatedLineItems;
        updatedCharge.subscription = updatedSubscription;

        /* Initially I was wrong here for the email template
         * It has created properties on the next box and messages on the next box
         * I need to gatherData differently
         */
        //const grouped = await reconcileGetGrouped({ charge: updatedCharge });
        //grouped[boxSubscription.purchase_item_id].subscription = updatedSubscription; // pass subscription to avoid api call

        const grouped = await reconcileGetGrouped({ charge });
        grouped[boxSubscription.purchase_item_id].subscription = subscription; // pass subscription to avoid api call

        let result = [];
        result = await gatherData({ grouped, result });
        result[0].attributes.charge_id = null;
        //console.log(JSON.stringify(result[0], null, 2));
        //console.log(result.length);

        let admin_email = _mongodb.collection("settings").findOne({handle: "admin-email"});
        if (admin_email) admin_email = admin_email.value;
        await subscriptionCreatedMail({ subscriptions: result, admin_email });

      } catch(err) {
        _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
      };

      meta = getMetaForCharge(updatedCharge, "charge/created via first order");
      meta.recharge = sortObjectByKeys(meta.recharge);
      _logger.notice(`Charge created, subsciptions updated, and email sent ${topicLower}.`, { meta });

      /*
       * Register this subscription as updating - ie awaiting webhooks
       * Now as the updates are run this should be resolved and put aside
       */
      const subscription_ids = meta.recharge.rc_subscription_ids.map(el => {
        return { ...el, updated: false };
      });
      const update = {
        label: "NEW SUBSCRIPTION",
        charge_id: updatedCharge.id,
        customer_id: updatedCharge.customer.id,
        address_id: updatedCharge.address_id,
        subscription_id: boxSubscription.purchase_item_id,
        scheduled_at: nextChargeScheduledAt,
        rc_subscription_ids: subscription_ids,
        updated_charge_date: false,
        title: boxSubscription.title,
        timestamp: new Date(),
      };
      delete boxSubscription.properties.Likes;
      delete boxSubscription.properties.Dislikes;
      const props = boxSubscription.properties.reduce(
        (acc, curr) => Object.assign(acc, { [`${curr.name}`]: curr.value === null ? "" : curr.value }),
        {});
      for (const [key, value] of Object.entries(props)) {
        update[key] = value;
      };
      //console.log(`Updating pending table with ${updatedCharge.id}`);
      await _mongodb.collection("updates_pending").updateOne(
        { charge_id: updatedCharge.id },
        { "$set" : update },
        { "upsert": true }
      );

      /*
       * do all the work and now run the updates
       */
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


    };

    /* verify that customer is in local mongodb, just adding current charge
      * here. It may overwrite existing charge_list but the db is updated
      * nightly through a cronjob and charge_list is an indicator only and not
      * used for anything important - mainly because it can be out of sync
      * during the course of a 24 hour period 
      */
    const doc = {
      first_name: charge.billing_address.first_name,
      last_name: charge.billing_address.last_name,
      email: charge.customer.email,
      recharge_id: parseInt(charge.customer.id),
      shopify_id: parseInt(charge.customer.external_customer_id.ecommerce),
      charge_list: [[ charge.id, charge.scheduled_at ]],
    };
    await _mongodb.collection("customers").updateOne(
      { recharge_id: parseInt(charge.customer.id) },
      { "$set" : doc },
      { "upsert": true }
    );


  } catch(err) {
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };

  return;
};


