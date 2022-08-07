/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { makeRechargeQuery } from "../../lib/recharge/helpers.js";
import { gatherData, reconcileGetGrouped } from "../../lib/recharge/reconcile-charge-group.js";
import subscriptionCreatedMail from "../../mail/subscription-created.js";

const delay = (t) => {
  return new Promise(resolve => setTimeout(resolve, t));
};

// wait to ensure that the charge has been created
const getCharge = async (subscription, t) => {
  await delay(t);
  const { charges } = await makeRechargeQuery({
    path: `charges`,
    query: [
      ["customer_id", subscription.customer_id ],
      ["address_id", subscription.address_id ],
      ["scheduled_at", subscription.next_charge_scheduled_at ],
      ["status", "queued" ]
    ]
  });
  const charge = (charges.length) ? charges[0] : null;
  return charge;
};

// wait to ensure that the charge has been created
const getSubscription = async (id, t) => {
  await delay(t);
  const { subscription } = await makeRechargeQuery({
    method: "GET",
    path: `subscriptions/${id}`,
  });
  return subscription;
};

export default async function subscriptionCreated(topic, shop, body) {

  const mytopic = "SUBSCRIPTION_CREATED";
  if (topic !== mytopic) {
    _logger.notice(`Recharge webhook ${topic} received but expected ${mytopic}`, { meta: { recharge: {} } });
    return;
  };
  const topicLower = topic.toLowerCase().replace(/_/g, "/");

  const subscription = JSON.parse(body).subscription;

  // make properties into easily accessible object
  const attributes = subscription.properties.reduce(
    (acc, curr) => Object.assign(acc, { [`${curr.name}`]: curr.value }),
    {});

  const meta = {
    recharge: {
      topic: topicLower,
      subscription_id: subscription.id,
      customer_id: subscription.customer_id,
      address_id: subscription.address_id,
      title: subscription.product_title,
    }
  };
  meta.recharge.delivered = attributes["Delivery Date"];
  _logger.notice(`Recharge webhook ${topicLower} received.`, { meta });

  // XXX Only match a box subscription for logging
  if (Object.keys(attributes).includes("Including")) {
    _logger.notice(`Recharge webhook ${topicLower} received.`, { meta });
  } else {
    // updating the attached subscriptions happens when the 'parent' box comes through
    return;
  };

  // Step 1 for created: change "order_day_of_week" to match 3 days before "Delivery Date"
  // "normal" weekdays in javascript are numbered Sunday = 0 but recharges uses Monday = 0
  // This is because recharge uses python in the backend
  // So to get our 3 days before we'll subtract 4 days
  // Thursday delivery => Sunday charge
  let deliveryDate = new Date(Date.parse(attributes["Delivery Date"]));
  let currentIdx = deliveryDate.getDay() - 4; // 0 = Sunday, javascript style
  if (currentIdx < 0) currentIdx = currentIdx + 7;

  // changing this on the subscription will update the "next_charge_scheduled_at"
  const orderDayOfWeek = currentIdx % 7;

  // Step 2 Now update the Delivery Date using
  // "order_interval_frequency" and "order_interval_unit": for us 1 weeks or 2 weeks
  // Requiring subscription to be made in "weeks" so as to be able to define order_day_of_week
  // if (subscription.order_interval_unit === "week") {
  // Note XXX this will break if the user sets units to days!
  const daysToNextDelivery = parseInt(subscription.order_interval_frequency) * 7;
  deliveryDate.setDate(deliveryDate.getDate() + daysToNextDelivery);

  // Step 3 for created: find the other items using charge api, add metada to connect them together
  // Wait here to be sure the charge object has been created in the recharge backend
  const charge = await getCharge(subscription, 20000);

  let ids = [];
  if (charge) {
    // purchase_item_id matches the subscription.id
    // for each of these and the current subscription object
    ids = charge.line_items.map(el => el.purchase_item_id);
  };

  if (ids.length === 0) {
    _logger.notice(`Recharge ${topicLower} no charge ${Boolean(charge)} or no ids ${ids.length}.`, { meta });
  };

  // XXX if this doesn't get anything then we have no idea

  // now update the properties for all of these
  for (const id of ids) {
    // get each addon subscription
    let itemSubscription;
    if (id === subscription.id) {
      itemSubscription = { ...subscription };
    } else {
      itemSubscription = await getSubscription(id, 1000);
    };
    // do likes and dislikes here
    let likes = "";
    let dislikes = "";
    let push = false;
    const properties = itemSubscription.properties.map(el => {
      // only the Box subscription has this property
      if (el.name === "Including") push = true;
      if (el.name === "Delivery Date") el.value = deliveryDate.toDateString(); // updated delivery date
      if (el.name === "Add on Items" || el.name === "Swapped Items") {
        if (el.value) likes = likes === "" ? el.value : `${likes},${el.value}`;
      };
      if (el.name === "Removed Items") {
        if (el.value) dislikes = dislikes === "" ? el.value : `${dislikes},${el.value}`;
      };
      if (el.value === null) el.value = "";
      return el;
    });
    if (push) { // i.e. only on the Box subscription
      properties.push({ name: "Likes", value: likes });
      properties.push({ name: "Disikes", value: dislikes });
    };
    // One property to bind them within the charge
    properties.push({ name: "box_subscription_id", value: subscription.id.toString() });

    const updateData = {
      order_day_of_week: orderDayOfWeek, // assign orderDay
      properties,
    };

    const boxProperties = updateData.properties.reduce(
      (acc, curr) => Object.assign(acc, { [`${curr.name}`]: curr.value === null ? "" : curr.value }),
      {});
    meta.recharge.next_delivery = boxProperties["Delivery Date"];
    _logger.notice(`Recharge ${topicLower} completed and subscription updated.`, { meta });
    const updateResult = await makeRechargeQuery({
      method: "PUT",
      path: `subscriptions/${id}`,
      body: JSON.stringify(updateData)
    });
  };

  const updatedSubscription = await getSubscription(subscription.id, 30000);

  // need to get the updated subscription after the charge was updated because
  // I don't trust myself to recalculaate the next_scheduled_at valueback or
  // forward?
  const updatedCharge = await getCharge(updatedSubscription, 20000);
  if (!updatedCharge) {
    // log it
    _logger.notice(`Recharge ${topicLower} failed to locate charge for compiling customer email.`, { meta });
  } else {
    const grouped = reconcileGetGrouped({ charge: updatedCharge });
    let result = [];
    result = await gatherData({ grouped, result });
    await subscriptionCreatedMail({ subscriptions: result });
  };
  return;
};
