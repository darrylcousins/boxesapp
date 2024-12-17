/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { ObjectId } from "mongodb";
import { gatherData, reconcileGetGrouped } from "../../lib/recharge/reconcile-charge-group.js";
import { formatDate, sortObjectByKeys } from "../../lib/helpers.js";
import updateSubscriptions from "../../lib/recharge/update-subscriptions.js";
import { upsertPending } from "../../api/recharge/lib.js";
import { makeRechargeQuery } from "../../lib/recharge/helpers.js";
import subscriptionCreatedMail from "../../mail/subscription-created.js";
import {
  getBoxesForCharge,
  getMetaForCharge,
  writeFileForCharge,
  updatePendingEntry,
} from "./helpers.js";

/* https://developer.rechargepayments.com/2021-11/webhooks_explained
 * 
 * The first time a charge is created (i.e. order through shopify) the
 * subscriptions do not have box_subscription_id set, the delivery date needs
 * to be updated. As does also the next charge date to sync with 3 days before
 * delivery
 *
 * Later a new charge is created after an order is processed and at point the
 * Delivery Date will need to be updated
 *
 * NOTE Returns false if no action is taken and true if some update occured
 *
 */
export default async function chargeCreated(topic, shop, body, { io, sockets, req }) {

  const mytopic = "CHARGE_CREATED";
  if (topic !== mytopic) {
    _logger.notice(`Recharge webhook ${topic} received but expected ${mytopic}`, { meta: { recharge: {} } });
    return false;
  };
  const topicLower = topic.toLowerCase().replace(/_/g, "/");

  const charge = JSON.parse(body).charge;

  writeFileForCharge(charge, mytopic.toLowerCase().split("_")[1]);

  let meta;
  let deliveryDate;
  let days;

  // hold a list of box subscription centred meta data for logging ie hold subscription_id for a box
  let listOfMeta = [];

  // get the line_items not updated with a box_subscription_id property and sort into boxes
  // and a simple list of box subscription ids already updated with box_subscription_id
  // NOTE box_subscription_ids is only populated when line_items already have
  // property['box_subscription_id'] set to a value, i.e. never if this is a
  // newly created order - it is used by charge/updated, but not here
  const { box_subscriptions_possible, box_subscription_ids } = getBoxesForCharge(charge);

  if ( charge.status === "success") {
    /* verify that customer is in local mongodb, and set or update charge list */
    const doc = {
      first_name: charge.billing_address.first_name,
      last_name: charge.billing_address.last_name,
      email: charge.customer.email,
      recharge_id: parseInt(charge.customer.id),
      shopify_id: parseInt(charge.customer.external_customer_id.ecommerce),
    };
    await _mongodb.collection("customers").updateOne(
      { recharge_id: parseInt(charge.customer.id) },
      { 
        "$set" : doc,
        "$addToSet" : { charge_list: [ parseInt(charge.id), charge.scheduled_at ] },
      },
      { "upsert": true }
    );
  };

  // Only process charges that have been successful i.e. were created an charged via shopify
  try {
    if ( charge.status !== "success") {
      if ( charge.status === "queued") {

        /* NOTE special case where when a subscription is paused or rescheduled a
         * new charge is created with all the line items correctly configured and
         * therefore 'after' the subscriptions are updated we no longer receive
         * a charge/upcoming webhook and the pending entry is never deleted
         * So here we attempt to do so in one algorithm. The idea being that if
         * we get through all the line_items and they are updated we can delete
         * the entry and emit finished
         * NOTE May need to add a delay because the front-end will then fetch the
         * box subscription which may not have yet been updated?
         * NOTE Found the situation where the newly created charge was not
         * updated when the new subscription was updated with
         * box_subscription_property so doesn't appear here in box_subscription_ids
         * So I'm now attempting to update the box_subscription property here
         * similar to what I do below with a new charge
         *
         */
        // start with the line_items using updatePendingEntry
        const meta = { recharge: { // base construct for meta
          customer_id: charge.customer.id,
          address_id: charge.address_id,
          scheduled_at: charge.scheduled_at,
        }};
        const actions = {};
        for (const boxId of box_subscription_ids) {
          actions[boxId] = null;
          const query = { ...meta.recharge, subscription_id: boxId };
          //console.log("charge/created pending query", query);
          const pending = await _mongodb.collection("updates_pending").findOne(query);
          //console.log("charge/created entry", pending);
          if (pending) actions[boxId] = pending.action;
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
            //console.log("charge/created entry.action", action);
            if (false) { // NOTE wait and see
              const { updated, entry } = await updatePendingEntry(meta, action, io, sockets);
              if (updated) {
                // sure that box is last
                if (sockets && io && Object.hasOwnProperty.call(sockets, entry.session_id)) {
                  const socket_id = sockets[entry.session_id];
                  io = io.to(socket_id);
                  const variant_title = meta.recharge.variant_title ? ` (${meta.recharge.variant_title})` : "";
                  io.emit("completed", `Subscription ${topicLower}: ${meta.recharge.title}${variant_title}`);
                };

                // check that all have been updated
                const allUpdated = entry.rc_subscription_ids.every(el => {
                  // check that all subscriptions have updated or have been created
                  return el.updated === true && Number.isInteger(el.subscription_id);
                });
                if (allUpdated) {
                  await _mongodb.collection("updates_pending").deleteOne({ _id: new ObjectId(entry._id) });
                  if (parseInt(process.env.DEBUG) === 1) {
                    _logger.notice(`Deleting pending entry subscription/updated (${meta.recharge.title})`, { meta: { recharge: entry }});
                  };
                  if (sockets && io && Object.hasOwnProperty.call(sockets, entry.session_id)) {
                    io.emit("completed", `Removing updates entry ${topicLower}.`);
                    io.emit("completed", `Updates completed.`);
                    const message = entry.action === "created" ? "created.complete" : "finished";
                    io.emit(message, {
                      action: entry.action,
                      session_id: entry.session_id,
                      subscription_id: entry.subscription_id,
                      address_id: entry.address_id,
                      customer_id: entry.customer_id,
                      scheduled_at: entry.scheduled_at,
                      charge_id: entry.charge_id,
                    });
                  };
                } else {
                  if (parseInt(process.env.DEBUG) === 1) {
                    _logger.notice(`Updated ${meta.recharge.title} - entry still pending.`, { meta: { recharge: entry } });
                  };
                };
              } else {
                if (parseInt(process.env.DEBUG) === 1) {
                  _logger.notice(`Updated ${meta.recharge.title} - unable to update pending.`, { meta: { recharge: entry } });
                };
              };
            };
          };
        };
      };
      return false;
    };
  } catch(err) {
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
    return false;
  };

  // nothing further to process if this is empty
  if (box_subscriptions_possible.length === 0) {
    return false;
  };

  try {
    if (box_subscriptions_possible.length > 1) {
      // log as an error because it will need investigating
      const err = {
        message: "Charge created, more than 1 possible box",
        level: "error",
        stack: null,
        charge_id: charge.id,
        box_subscriptions: box_subscription_possible.map(el => el.subscription_id),
        customer_id: charge.customer.id,
        address_id: charge.address_id,
        description: "charge/created webhook exited so action required",
      };
      _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
      return false;
    };
  } catch(err) {
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
    return false;
  };

  /* 
   * From here down for newly created subscriptions through shopfiy which is the only thing we care about
   */
  try {

    // The worst case would be if two box subscriptions came in with the same title and
    // I have no way to distinguish them from the other
    // box_subscriptions_possible.length should only ever one, and we exit above, so not looping

    let boxSubscription; // hang on the box subscription for logging
    /* Collect values used when updating subscriptions */
    let currentDeliveryDate;
    let boxSubscriptionId;
    let nextChargeScheduledAt;
    let orderDayOfWeek;
    let subscription; // passed onto the email algorithm

    const box_item = box_subscriptions_possible[0];

    // the box subscription which joins all items together has been found
    boxSubscriptionId = box_item.subscription_id;

    // save boxSubscription line_item for logging
    boxSubscription = box_item.line_items.find(el => el.purchase_item_id === boxSubscriptionId);

    // get the subscription so as to access order_interval_frequency
    const query = await makeRechargeQuery({
      path: `subscriptions/${boxSubscriptionId}`,
      method: "GET",
      title: `Fetching ${box_item.title} for ${topicLower}`,
    });
    subscription = query.subscription;

    /*
     * Update the Delivery Date using "order_interval_frequency" and
     * "order_interval_unit": for us 1 weeks or 2 weeks Requiring
     * subscription to be made in "weeks" so as to be able to define
     * order_day_of_week if (subscription.order_interval_unit === "week") {
     * Note this will break if the user sets units to days, which should
     * not be possible
     */
    days = parseInt(subscription.order_interval_frequency) * 7; // number of weeks by 7
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

      updates.push({
        subscription_id: line_item.purchase_item_id, 
        order_day_of_week: orderDayOfWeek, // assign orderDay
        properties: line_item.properties,
        next_charge_scheduled_at: nextChargeScheduledAt,
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

    updatedCharge.scheduled_at = nextChargeScheduledAt;
    updatedCharge.line_items = updatedLineItems;
    updatedCharge.subscription = updatedSubscription;

    meta = getMetaForCharge(updatedCharge, "charge/created via first order");
    meta.recharge = sortObjectByKeys(meta.recharge);

    /*
     * Register this subscription as updating - ie awaiting webhooks
     * Now as the updates are run this should be resolved and put aside
     */
    const subscription_ids = meta.recharge.rc_subscription_ids.map(el => {
      return { ...el, updated: false };
    });

    const entry_id = await upsertPending({
      action: "created",
      charge_id: charge.id,
      customer_id: updatedCharge.customer.id,
      address_id: updatedCharge.address_id,
      subscription_id: boxSubscription.purchase_item_id,
      scheduled_at: nextChargeScheduledAt,
      deliver_at: deliveryDate,
      rc_subscription_ids: subscription_ids,
      title: boxSubscription.title,
      session_id: null,
    });

    // the following is simply to gather data for the email
    const grouped = await reconcileGetGrouped({ charge });
    grouped[boxSubscription.purchase_item_id].subscription = subscription; // pass subscription to avoid api call

    let result = [];
    result = await gatherData({ grouped, result });

    //result[0].attributes.charge_id = null; // can I get this from the updates_pending entry?
    // correct the upcoming dates
    result[0].attributes.nextChargeDate = nextChargeDate.toDateString();
    result[0].attributes.nextDeliveryDate = deliveryDate;
    result[0].attributes.lastOrder.current = true;

    // email template used an array of subscriptions - here it is an array of
    // one, only on the creation of a new subscription via a shopify order
    const mailOpts = {
      subscription: result[0],
      address: updatedCharge.shipping_address };

    let entry;
    let timer;
    // only once all updates are complete do we send the email
    timer = setInterval(async () => {
      entry = await _mongodb.collection("updates_pending").findOne({ "_id": entry_id });
      if (!entry) {
        clearInterval(timer);
        // compile data for email to customer the updates have been completed
        await subscriptionCreatedMail(mailOpts);
        _logger.notice(`Charge created, subscriptions updated, and email sent.`, { meta });
      };
    }, 10000);

    // now run the updates
    await updateSubscriptions({ address_id: charge.address_id, updates, req });

  } catch(err) {
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
    return false;
  };

  return true;
};


