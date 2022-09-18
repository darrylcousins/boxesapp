/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { matchNumberedString, delay } from "../../lib/helpers.js";
import { makeRechargeQuery } from "../../lib/recharge/helpers.js";
import { gatherData, reconcileGetGrouped } from "../../lib/recharge/reconcile-charge-group.js";
import subscriptionCreatedMail from "../../mail/subscription-created.js";

const getCharge = async (subscription) => {
  const result = await makeRechargeQuery({
    path: `charges`,
    query: [
      ["customer_id", subscription.customer_id ],
      ["address_id", subscription.address_id ],
      ["scheduled_at", subscription.next_charge_scheduled_at ],
      ["status", "queued" ]
    ]
  });
  let charge = null;
  if (Object.hasOwnProperty.call(result, "charges")) {
    charge = (result.charges.length) ? result.charges[0] : null;
  }
  return charge;
};

const sleepUntil = async (subscription, timeoutMs) => {
  return new Promise((resolve, reject) => {
    let timeWas = new Date();
    let wait = setInterval(async function() {
      let charge = await getCharge(subscription);
      if (charge) {
        try {
          clearInterval(wait);
        } catch(e) {
          console.log("Failed to clear interval on resolve");
        };
        resolve(charge.id);
      } else if (new Date() - timeWas > timeoutMs) { // Timeout
        try {
          clearInterval(wait);
        } catch(e) {
          console.log("Failed to clear interval on reject");
        };
        reject(0); // no charge found
      }
    }, 5000); // repeat the attempt every 5 sec until timeout at timeoutMs
  });
}
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
  //_logger.notice(`Recharge webhook ${topicLower} received.`, { meta });

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
  // Thursday delivery => Monday charge
  // Tuesday delivery => Saturday charge
  let deliveryDate = new Date(Date.parse(attributes["Delivery Date"]));
  let currentIdx = deliveryDate.getDay() - 4; // 0 = Sunday, javascript style
  if (currentIdx < 0) currentIdx = currentIdx + 7; // fix to ensure the future

  // changing this on the subscription will update the "next_charge_scheduled_at"
  // XXX found that next charge may be wrong for a delivery day more than a week out!!!
  // XXX because recharge will pick the next date matching order_day_of_week!!!
  // therefore should probable also set next_charge_scheduled_at
  // note this needs the api call to subscription/{id}/set_next_charge_date
  // see api/recharge-update-charge-date.js for example
  const orderDayOfWeek = currentIdx % 7;

  // Step 2 Now update the Delivery Date using
  // "order_interval_frequency" and "order_interval_unit": for us 1 weeks or 2 weeks
  // Requiring subscription to be made in "weeks" so as to be able to define order_day_of_week
  // if (subscription.order_interval_unit === "week") {
  // Note XXX this will break if the user sets units to days!
  const daysToNextDelivery = parseInt(subscription.order_interval_frequency) * 7;
  deliveryDate.setDate(deliveryDate.getDate() + daysToNextDelivery);

  // with the delivery date we fix the next_charge_scheduled_at to 3 days prior
  const offset = deliveryDate.getTimezoneOffset()
  let nextChargeDate = new Date(deliveryDate.getTime() - (offset*60*1000));
  nextChargeDate.setDate(nextChargeDate.getDate() - 3);
  // Put to the required yyyy-mm-dd format
  let nextChargeScheduledAt = nextChargeDate.toISOString().substring(0,10);

  console.log(nextChargeDate.toDateString(), orderDayOfWeek);
  console.log(deliveryDate.toDateString());

  // Step 3 for created: find the other items using charge api, add metada to connect them together
  // Wait here to be sure the charge object has been created in the recharge backend
  await delay(10000); // wait 10 seconds
  const charge_id = await sleepUntil(subscription, 60000); // tries every 5 secs for 1 min

  let charge; 
  let chargeResult;
  if (parseInt(charge_id) > 0) {
    chargeResult = await makeRechargeQuery({
      path: `charges/${charge_id}`,
    });
    if (Object.hasOwnProperty.call(chargeResult, "charge")) {
      charge = chargeResult.charge;
    };
  };

  if (!charge) {
    _logger.notice(`Recharge ${topicLower} no charge found.`, { meta });
    return;
  };

  const line_items = charge.line_items.filter(el => el.purchase_item_id !== subscription.id);

  const first = charge.line_items.find(el => el.purchase_item_id === subscription.id);
  //line_items.unshift(first); // make sure its the first
  line_items.push(first); // make sure its the last because we will commit to charge

  const updatedLineItems = []; // updated with new properties

  let updatedSubscription; // updated box subscription

  // now update the properties for all of these
  for (const lineItem of line_items) {
    
    // do likes and dislikes here
    let likes = "";
    let dislikes = "";
    let push = false;
    const properties = lineItem.properties.map(el => {
      // only the Box subscription has this property
      if (el.name === "Including") push = true;
      if (el.name === "Delivery Date") el.value = deliveryDate.toDateString(); // updated delivery date
      if (el.name === "Add on Items" || el.name === "Swapped Items") {
        // need to remove the count here for likes and dislikes
        if (el.value) {
          const strMatch = matchNumberedString(el.value);
          likes = likes === "" ? strMatch.title : `${likes},${strMatch.title}`;
        };
      };
      if (el.name === "Removed Items") {
        if (el.value) dislikes = dislikes === "" ? el.value : `${dislikes},${el.value}`;
      };
      if (el.value === null) el.value = "";
      return el;
    });

    // thinking of removing likes and dislikes
    likes = likes.split(",").sort().join(",");
    dislikes = dislikes.split(",").sort().join(",");
    if (push) { // i.e. only on the Box subscription
      if (!properties.find(el => el.name === "Likes")) {
        properties.push({ name: "Likes", value: likes });
        properties.push({ name: "Dislikes", value: dislikes });
      };
    };
    // One property to bind them within the charge
    properties.push({ name: "box_subscription_id", value: subscription.id.toString() });

    if (lineItem.item_purchase_id === subscription.id) {
      subscription.properties = properties;
    };

    // absolutely must set the next_charge_scheduled_at because if the delivery
    // date may be a week or 2 out

    const updateData = {
      order_day_of_week: orderDayOfWeek, // assign orderDay
      properties,
    };
    if (push) updateData.commit = true; // on the final call commit 

    lineItem.properties = properties;
    updatedLineItems.push(lineItem);

    const updateResult = await makeRechargeQuery({
      method: "PUT",
      path: `subscriptions/${lineItem.purchase_item_id}`,
      body: JSON.stringify(updateData)
    }).then(async (res) => {
      if (res.subscription.next_charge_scheduled_at !== nextChargeScheduledAt) {
        console.log('updateing schedule');
        body = { date: nextChargeScheduledAt };
        return await makeRechargeQuery({
          method: "POST",
          path: `subscriptions/${res.subscription.id}/set_next_charge_date`,
          body: JSON.stringify(body),
        });
      } else {
        return res;
      };
    });
    if (push) updatedSubscription = updateResult.subscription;

    await delay(500); // give time between requests
  };

  meta.recharge.next_delivery = deliveryDate.toDateString();
  _logger.notice(`Recharge ${topicLower} completed and subscription updated.`, { meta });


  try {
    // doing this to avoid a further call to api for the updated charge
    // which I often found wasn't updated in time to make the call
    const updatedCharge = { ...charge };
    updatedCharge.scheduled_at = nextChargeScheduledAt;
    updatedCharge.line_items = updatedLineItems;

    const grouped = reconcileGetGrouped({ charge: updatedCharge });
    grouped[subscription.id].subscription = subscription; // pass subscription to avoid api call

    let result = [];
    result = await gatherData({ grouped, result });
    result[0].attributes.charge_id = null;

    // should be able to do for picking up non-subcription products
    // will this also pick quantity incremented? What of swaps etc?
    //await updateSubscriptions({ updates: result[0].updates });

    let admin_email = _mongodb.collection("settings").findOne({handle: "admin-email"});
    if (admin_email) admin_email = admin_email.value;
    await subscriptionCreatedMail({ subscriptions: result, admin_email });

  } catch(err) {
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
  return;
};
