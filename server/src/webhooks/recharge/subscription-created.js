/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { makeRechargeQuery } from "../../lib/recharge/helpers.js";
import { getIncludedSubscriptions } from "./lib.js";

export default async function subscriptionCreated(topic, shop, body) {

  const mytopic = "SUBSCRIPTION_CREATED";
  if (topic !== mytopic) {
    _logger.notice(`Recharge webhook ${topic} received but expected ${mytopic}`, { meta: { recharge: {} } });
    return;
  };

  const subscription = JSON.parse(body).subscription;

  const meta = {
    recharge: {
      topic: mytopic.toLowerCase().replace(/_/g, "/"),
      subscription_id: subscription.id,
      customer_id: subscription.customer_id,
      address_id: subscription.address_id,
      title: subscription.product_title,
    }
  };

  // make properties into easily accessible object
  const attributes = subscription.properties.reduce(
    (acc, curr) => Object.assign(acc, { [`${curr.name}`]: curr.value }),
    {});

  // XXX Only match a box subscription!!
  if (!Object.keys(attributes).includes("Including")) {
    _logger.notice(`Recharge webhook ${topic.toLowerCase().replace(/_/g, "/")} received, not a box ${subscription.product_title}.`, { meta });
    return;
  };

  _logger.notice(`Recharge webhook ${topic.toLowerCase().replace(/_/g, "/")} received.`, { meta });

  // Step 1 for created: change "order_day_of_week" to match 3 days before "Delivery Date"
  // "normal" weekdays in javascript are numbered Sunday = 0 but recharges uses Monday = 0
  // so to get our 4 days before we'll subtract 4 days
  // Thursday delivery => Sunday charge
  let deliveryDate = new Date(Date.parse(attributes["Delivery Date"]));
  let currentIdx = deliveryDate.getDay() - 4; // 0 = Sunday, javascript style
  if (currentIdx < 0) currentIdx = currentIdx + 7;

  // XXX first update - do the same for included items
  const orderDayOfWeek = currentIdx % 7;
  // XXX question remains, will this update the "next_charge_scheduled_at"?
  // Yes appears to

  // Step 2 for created: XXX I assume that that we can now update the Delivery Date using
  // "order_interval_frequency" and "order_interval_unit": for us 1 weeks or 2 weeks
  // if (subscription.order_interval_unit === "week") {
  const daysToNextDelivery = parseInt(subscription.order_interval_frequency) * 7;
  deliveryDate.setDate(deliveryDate.getDate() + daysToNextDelivery);
  
  // Step 3 for created: find the other items using charge api, add metada to connect them together
  const included_subscriptions = await getIncludedSubscriptions(subscription);

  // purchase_item_id matches the subscription.id
  // for each of these and the current subscription object
  const ids = included_subscriptions.map(el => el.purchase_item_id);

  // now update the properties for all of these
  for (const id of ids) {
    // get each addon subscription
    const subscriptionResult = await makeRechargeQuery({
      method: "GET",
      path: `subscriptions/${id}`,
    });
    // do likes and dislikes here
    let likes = "";
    let dislikes = "";
    let push = false;
    const properties = subscriptionResult.subscription.properties.map(el => {
      // only the Box subscription has this property
      if (el.name === "Including") push = true;
      if (el.name === "Delivery Date") el.value = deliveryDate.toDateString(); // updated delivery date
      if (el.name === "Add on Items" || el.name === "Swapped Items") {
        if (el.value) {
          likes = likes === "" ? el.value : `${likes},${el.value}`;
        };
      };
      if (el.name === "Removed Items") {
        if (el.value) {
          dislikes = dislikes === "" ? el.value : `${dislikes},${el.value}`;
        };
      };
      if (el.value === null) el.value = "";
      return el;
    });
    if (push) { // i.e. only on the Box subscription and not the addons
      // XXX Noting that passing an empty string stores in fact a "null" value
      // i.e. don't always expect and empty string, testing for Bool is enough
      properties.push({
        name: "Likes",
        value: likes,
      });
      properties.push({
        name: "Dislikes",
        value: dislikes,
      });
    };
    // One property to bind them. We have a "Addon Product To" property which matches the box
    // here we add a "hidden" property "box_subscription_id"
    // so now I can loop through "charge.line_items" and find only the items
    // connected to the Box subscription - see for example webhooks/recharge/charge-upcoming
    properties.push({
     name: "box_subscription_id",
     value: subscription.id.toString()
    });
    const updateData = {
      order_day_of_week: orderDayOfWeek, // assign orderDay
      properties,
    };
    const boxProperties = properties.reduce(
      (acc, curr) => Object.assign(acc, { [`${curr.name}`]: curr.value === null ? "" : curr.value }),
      {});
    _logger.notice(`Recharge webhook ${topic.toLowerCase().replace(/_/g, "/")} subscription updated.`, { meta: { recharge: boxProperties } });
    console.log("UPDATING SUBSCRIPTION IN WEBHOOK subscription/created");
    console.log(updateData);
    const updateResult = await makeRechargeQuery({
      method: "PUT",
      path: `subscriptions/${id}`,
      body: JSON.stringify(updateData)
    });
    console.log(updateResult);
  };
};
