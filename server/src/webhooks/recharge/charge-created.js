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

  // XXX explantion please
  if ( !charge.processed_at) {
    console.log("charge not processed so returning")
    return;
  };

  // capture the first charge by checking for box_subsciption_id
  // subsequent charges will have this property and no action required
  let cancel; // flag if box_subscription_id already set
  let attributes; // reduce properties for easy access

  // locate parent subscription
  // XXX again this shows we can only make one subscription order per cart
  const children = [];
  let parent;

  try {
    // get the parent subscription and ignore if box_subscription_id is set
    for (const line_item of charge.line_items) {

      const { purchase_item_id: id, properties, title } = line_item;

      // make properties into easily accessible object
      attributes = properties.reduce(
        (acc, curr) => Object.assign(acc, { [`${curr.name}`]: curr.value }),
        {});

      if (Object.keys(attributes).includes("Including")) {
        parent = { id, attributes, title };
      };

      // consider checking all line_items?
      cancel = line_item.properties.some(el => el.name === "box_subscription_id");
      if (cancel) break;

    };

    console.log(charge.id, "got a cancel value:", cancel);
    if (cancel) return; // box_subscription_id already set
    fs.writeFileSync(`recharge.charge-${charge.id}.json`, JSON.stringify(charge, null, 2));

  } catch(err) {
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };


  // We need order_interval_frequency so must get the subscription
  const subscription = await getSubscription(parent.id);

  /* 
   * Step 1 for created: change "order_day_of_week" to match 3 days before "Delivery Date"
   * "normal" weekdays in javascript are numbered Sunday = 0 but recharges uses Monday = 0
   * This is because recharge uses python in the backend
   * So to get our 3 days we'll subtract 4 days
   * Thursday delivery => Monday charge
   * Tuesday delivery => Saturday charge
   */
  let firstDeliveryDate = parent.attributes["Delivery Date"]; // keep this for the log meta data
  let deliveryDate = new Date(Date.parse(parent.attributes["Delivery Date"]));
  let currentIdx = deliveryDate.getDay() - 4; // 0 = Sunday, javascript style
  if (currentIdx < 0) currentIdx = currentIdx + 7; // fix to ensure the future

  /* 
   * changing this on the subscription will update the
   * "next_charge_scheduled_at" but because recharge will pick the next date
   * matching order_day_of_week we also set next_charge_scheduled_at as below
   * using the api call to subscription/{id}/set_next_charge_date see
   * api/recharge-update-charge-date.js for example This is only applicable to
   * subscriptions with order_interval_unit = “week”.  Value of 0 equals to
   * Monday, 1 to Tuesday etc.
   */
  const orderDayOfWeek = currentIdx % 7;

  /*
   * Step 2 Now update the Delivery Date using
   * "order_interval_frequency" and "order_interval_unit": for us 1 weeks or 2 weeks
   * Requiring subscription to be made in "weeks" so as to be able to define order_day_of_week
   * if (subscription.order_interval_unit === "week") {
   * Note this will break if the user sets units to days, which should not be possible
   */
  const daysToNextDelivery = parseInt(subscription.order_interval_frequency) * 7;
  deliveryDate.setDate(deliveryDate.getDate() + daysToNextDelivery);

  // with the delivery date we fix the next_charge_scheduled_at to 3 days prior
  const offset = deliveryDate.getTimezoneOffset()
  let nextChargeDate = new Date(deliveryDate.getTime() - (offset*60*1000));
  nextChargeDate.setDate(nextChargeDate.getDate() - 3);
  // Put to the required yyyy-mm-dd format
  let nextChargeScheduledAt = nextChargeDate.toISOString().substring(0,10);

  const delivery = deliveryDate.toDateString();

  const updatedLineItems = []; // update line items to match subscription updates

  // update subscriptions with properties and dates
  let props;
  let updateData;


  for (const line_item of charge.line_items) {
    // make properties into easily accessible object
    attributes = line_item.properties.reduce(
      (acc, curr) => Object.assign(acc, { [`${curr.name}`]: curr.value }),
      {});

    props = { ...attributes };
    props["Delivery Date"] = delivery;
    props["box_subscription_id"] = parent.id.toString();

    line_item.properties = Object.keys(props).map((key) => { return { name: key, value: props[key] }});

    updatedLineItems.push(line_item);

    if (Object.keys(attributes).includes("Including")) {
      continue; // ignore the parent in this loop
    };

    updateData = {
      order_day_of_week: orderDayOfWeek, // assign orderDay
      properties: Object.keys(props).map((key) => { return { name: key, value: props[key] }}),
    };
    await updateSubscription(line_item.purchase_item_id, updateData);
    await updateChargeDate(line_item.purchase_item_id, nextChargeScheduledAt);

  };

  // and the parent
  props = { ...parent.attributes };
  props["Delivery Date"] = delivery;
  props["box_subscription_id"] = parent.id.toString();

  updateData = {
    order_day_of_week: orderDayOfWeek, // assign orderDay
    properties: Object.keys(props).map((key) => { return { name: key, value: props[key] }}),
  };
  await updateSubscription(parent.id, updateData);
  await updateChargeDate(parent.id, nextChargeScheduledAt);

  const updatedSubscription = { ...subscription };
  updatedSubscription.properties = Object.keys(props).map((key) => { return { name: key, value: props[key] }});

  const updatedCharge = { ...charge };

  try {
    updatedCharge.scheduled_at = nextChargeScheduledAt;
    updatedCharge.line_items = updatedLineItems;

    const grouped = reconcileGetGrouped({ charge: updatedCharge });
    grouped[parent.id].subscription = updatedSubscription; // pass subscription to avoid api call

    let result = [];
    result = await gatherData({ grouped, result });
    result[0].attributes.charge_id = null;

    let admin_email = _mongodb.collection("settings").findOne({handle: "admin-email"});
    if (admin_email) admin_email = admin_email.value;
    await subscriptionCreatedMail({ subscriptions: result, admin_email });

  } catch(err) {
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };

  topicLower = "subscription/created"; // makes the logs clearer
  const meta = {
    recharge: {
      topic: `${topicLower} via first charge`,
      charge_id: charge.id,
      subscription_id: parent.id,
      customer_id: charge.customer.id,
      address_id: charge.address_id,
      box: parent.title,
      delivered: firstDeliveryDate,
      next_delivery: delivery,
      email: charge.customer.email,
    }
  };

  _logger.notice(`Recharge webhook ${topicLower} received.`, { meta });

  try {
    //fs.writeFileSync(`recharge.charge-${charge.id}.json`, JSON.stringify(charge, null, 2));
    fs.writeFileSync(`recharge.charge-${charge.id}-updated.json`, JSON.stringify(updatedCharge, null, 2));

  } catch(err) {
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
  return;
};


