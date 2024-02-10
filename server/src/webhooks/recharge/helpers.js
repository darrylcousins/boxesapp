/**
 * Provide some helper methods for recharge webhooks
 *
 * @module webhooks/recharge/helpers
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import fs from "fs";
import { matchNumberedString } from "../../lib/helpers.js";

/*
 * @function updatePendingEntry
 * @prop topic - one of "created, updated, deleted"
 * some variations to algorithm depending on the topic
 * 
 * XXX darn not working for charge upcoming
 */
export const updatePendingEntry = async (meta, topic) => {
  /* the values stored in the pending table are how the subscription should
   * end up, i.e. a new quantity, or delivery/charge date 
   */

  console.log("updatePendingEntry ===============");
  console.log("topic", topic);
  console.log("title", meta.recharge.title);
  const quantity = (topic === "deleted") ? 0 : meta.recharge.quantity;

  let match = [
    { shopify_product_id: meta.recharge.shopify_product_id },
    { updated: false },
  ];

  if (topic === "deleted" || topic === "updated") {
    match = [ ...match,
      { quantity }, // no quantity for cancelled and zero for deleted
    ];
  } else if (topic !== "created") {
    match = [ ...match,
      { subscription_id: meta.recharge.item_subscription_id },
    ];
  } else if (topic === "created") {
    match = [ ...match,
      { subscription_id: null }, // could add updated?
    ];
  };

  const query = {
    subscription_id: meta.recharge.subscription_id,
    customer_id: meta.recharge.customer_id,
    address_id: meta.recharge.address_id,
    rc_subscription_ids:
      { $elemMatch: { $and: match } }
  };
  console.log("match", match);

  // deleted and cancelled subscriptions have this set to null already so match will be found
  if (topic !== "deleted" && topic !== "cancelled") query.scheduled_at = meta.recharge.scheduled_at;

  // not correctly set yet?
  if (topic !== "created" && topic !== "deleted") query.deliver_at = meta.recharge["Delivery Date"];
  
  const update = { $set: {
    "rc_subscription_ids.$[i].updated": true
  }};

  let subscription_id = meta.recharge.item_subscription_id;

  if (topic === "created") {
    // set the new subscription id
    update["$set"]["rc_subscription_ids.$[i].subscription_id"] = meta.recharge.item_subscription_id;
    subscription_id = null; // for the array filter
  };

  const options = {
    arrayFilters: [
      {
        "i.shopify_product_id": meta.recharge.shopify_product_id,
        "i.subscription_id": subscription_id,
      }
    ]
  };

  const res =  await _mongodb.collection("updates_pending").updateOne(query, update, options);
  console.log("query", query);

  let result = {};

  if (res.matchedCount > 0) {
    delete query.rc_subscription_ids; // has been mutated so remove from query
    const entry = await _mongodb.collection("updates_pending").findOne(query);

    result = { entry, updated: true };
  } else {

    // need to mutate the rc_subscription_ids for logger formatting
    // but still hopeful to get the entry itself so as to find the session_id
    query.rc_subscription_ids = [{ 
      shopify_product_id: meta.recharge.shopify_product_id,
      subscription_id: meta.recharge.item_subscription_id,
      quantity: meta.recharge.quantity,
      title: meta.recharge.title,
    }];
    result = { entry: query, updated: false };
  };
  console.log("updated?", result.updated);
  return result;
};

/*
 * @function getMetaForCharge
 */
export const getMetaForCharge = (charge, topic) => {
  // XXX not grouping for different boxes
  /* Start logging all details */
  const rc_subscription_ids = [];
  let properties;
  let title;
  for (const line_item of charge.line_items) {
    if (line_item.properties.some(el => el.name === "Including")) {
      title = line_item.title;
      properties = line_item.properties.reduce(
        (acc, curr) => Object.assign(acc, { [`${curr.name}`]: curr.value === null ? "" : curr.value }),
        {});
    };
    rc_subscription_ids.push({
      shopify_product_id: parseInt(line_item.external_product_id.ecommerce),
      subscription_id: parseInt(line_item.purchase_item_id),
      quantity: parseInt(line_item.quantity),
      title: line_item.title,
    });
  };
  const shopify_order_id = isNaN(parseInt(charge.external_order_id.ecommerce)) ? 
    "" : parseInt(charge.external_order_id.ecommerce);
  const meta = {
    recharge: {
      topic,
      title,
      charge_id: charge.id,
      customer_id: charge.customer.id,
      email: charge.customer.email,
      address_id: charge.address_id,
      charge_status: charge.status,
      shopify_order_id,
      charge_processed_at: charge.processed_at,
      scheduled_at: charge.scheduled_at,
      rc_subscription_ids,
    },
  };
  if (properties) {
    delete properties.Likes;
    delete properties.Dislikes;
    for (const [key, value] of Object.entries(properties)) {
      if (key === "box_subscription_id") {
        meta.recharge["Box Subscription"] = value;
      } else {
        meta.recharge[key] = value;
      };
    };
    if (Object.hasOwnProperty.call(properties, "box_subscription_id")) {
      meta.recharge.subscription_id = parseInt(properties.box_subscription_id);
    };
  };
  /* End logging all details */

  return meta;
};

/*
 * @ function getMetaForSubscription
 */
export const getMetaForSubscription = (subscription, topic) => {
  /* Start logging all details */
  const properties = subscription.properties.reduce(
    (acc, curr) => Object.assign(acc, { [`${curr.name}`]: curr.value === null ? "" : curr.value }),
    {});
  const meta = {
    recharge: {
      topic,
      item_subscription_id: subscription.id,
      customer_id: subscription.customer_id,
      address_id: subscription.address_id,
      title: subscription.product_title,
      variant_title: subscription.variant_title,
      scheduled_at: subscription.next_charge_scheduled_at,
      shopify_product_id: parseInt(subscription.external_product_id.ecommerce),
      quantity: parseInt(subscription.quantity),
    }
  };
  delete properties.Likes;
  delete properties.Dislikes;
  for (const [key, value] of Object.entries(properties)) {
    if (key === "box_subscription_id") continue;
    meta.recharge[key] = value;
  };
  if (Object.hasOwnProperty.call(properties, "box_subscription_id")) {
    meta.recharge.subscription_id = parseInt(properties.box_subscription_id);
  };
  /* End logging all details */

  return meta;
};

/*
 * @ function writeFile
 */
export const writeFile = (json, type, topic) => {

  if (!topic.toLowerCase().startsWith("CHARGE")) return;

  if (process.env.NODE_ENV !== "development") return;

  /* development logging stuff */
  const d = new Date();
  const s = `${d.getHours()}-${d.getMinutes()}-${d.getSeconds()}`;
  try {
    fs.writeFileSync(`recharge.${type}-${topic}-${s}-${json.id}.json`, JSON.stringify(json, null, 2));
  } catch(err) {
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
  /* end development logging stuff */
};

/*
 * @function writeFileForSubscription
 */
export const writeFileForSubscription = (subscription, topic) => {
  writeFile(subscription, "subscription", topic);
};

/*
 * @function writeFileForCharge
 */
export const writeFileForCharge = (charge, topic) => {
  writeFile(charge, "charge", topic);
};

/*
 * @function writeFileForOrder
 */
export const writeFileForOrder = (order, topic) => {
  writeFile(order, "order", topic);
};

/*
 * helper method to build logging meta for multiple subscriptions
 * @function buildMetaForBox
 */
export const buildMetaForBox = (id, charge, topic) => {
  const tempCharge = { ...charge };
  // remove any line items not linked to this box subscription
  tempCharge.line_items =  charge.line_items.filter(el => {
    if (el.properties.some(el => el.name === "box_subscription_id")) {
      if (parseInt(el.properties.find(el => el.name === "box_subscription_id").value) === id) return true;
    };
    return false;
  });
  return getMetaForCharge(tempCharge, topic);
};

/*
 * helper method to build list of title, quantity from string
 * @ function buildMetaForBox
 */
export const itemStringToList = (props, name) => {
  if (Boolean(props.find(el => el.name === name).value)) {
    return props
      .find(el => el.name === name).value
      .split(",")
      .filter(el => el.trim() !== "")
      .map(el => matchNumberedString(el));
  } else {
    return [];
  };
};

/*
 * get the line_items not updated with a box_subscription_id property and sort into boxes
 * and a simple list of box subscription ids already updated with box_subscription_id
 * @ function sortCharge
 */
export const getBoxesForCharge = (charge) => {
  let box_subscriptions_possible = [];
  let box_subscription_ids = [];
  for (const line_item of charge.line_items) {
    if (line_item.properties.some(el => el.name === "box_subscription_id")) {
      box_subscription_ids.push(parseInt(line_item.properties.find(el => el.name === "box_subscription_id").value));
    } else {
      // group these using line_item.title if "Including" and properties "Add on product to"
      // create a shape that includes the Add on items and quantities and subcription id 
      // then I should be able to pretty much gather up the correct items to the box
      // even if the worst case of double box subscription orders were allowed
      // i.e. we could have 2 Small Boxes - they will have different subscription ids
      // using extras might be how to reconcile near identical boxes, ie
      // decrement the quantity each time one is matched to a box of the same
      // title
      if (line_item.properties.some(el => el.name === "Including")) {
        let including = itemStringToList(line_item.properties, "Including")
          .map(el => { el.quantity--; return el; }) // includes have one for free
          .filter(el => el.quantity > 0);
        let swaps = itemStringToList(line_item.properties, "Swapped Items")
          .map(el => { el.quantity--; return el; }) // includes have one for free
          .filter(el => el.quantity > 0);
        let addons = itemStringToList(line_item.properties, "Add on Items");
        // defines unique box subscriptions, will only fail if has identical addons
        const box = {
          subscription_id: line_item.purchase_item_id,
          title: line_item.title,
          extras: [ ...including, ...addons, ...swaps],
          line_items: [] // to collect connected items in this box
        };
        box_subscriptions_possible.push(box);
      };
    };
  };

  // best I can see is that this will only happen once on creation of a box subscription
  // also we only allow one order per customer at a time so should never find two here
  // however below I have looped through these to manage a subscription at a time
  // it could only fail if say 2 Small Boxes with identical extras
  if (box_subscriptions_possible.length > 0) {
    for (const line_item of charge.line_items) {
      // skip those with box_subscription_id
      if (!line_item.properties.some(el => el.name === "box_subscription_id")) {
        let name;
        // use title to gather line_item objects
        if (line_item.properties.some(el => el.name === "Add on product to")) {
          name = line_item.properties.find(el => el.name === "Add on product to").value;
        } else {
          name = line_item.title;
        };
        let item_id = line_item.purchase_item_id;
        const possible = box_subscriptions_possible.filter(el => el.title === name);
        for (const poss of possible) {
          if (poss.subscription_id === item_id) {
            // the box subscription
            poss.line_items.push(line_item);
          };
          // this might be where I'm missing swaps?
          if (poss.extras.find(el => el.title === line_item.title && el.quantity === line_item.quantity)) {
            // match title and quantity
            // here is where we might be able sort between different boxes, ie
            // instead of matching el.quantity we could pull it out of extras
            // each time a match is made
            poss.line_items.push(line_item);
          };
        };
      };
    };
  };

  box_subscription_ids = Array.from(new Set(box_subscription_ids)); // make unique list
  
  return { box_subscription_ids, box_subscriptions_possible };
};
