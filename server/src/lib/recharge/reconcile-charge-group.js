/*
 * @module api/recharge/reconcile-charge-group.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { sortObjectByKeys, matchNumberedString } from "../helpers.js";
import { getNZDeliveryDay } from "../dates.js";
import { getLastOrder, makeRechargeQuery } from "./helpers.js";
import isEqual from "lodash.isequal";
import { winstonLogger } from "../../../config/winston.js";

const getLogger = () => {
  if (typeof _logger === "undefined") {
    return winstonLogger;
  } else {
    return _logger;
  };
};

/*
 * @function reconcileGetGrouped
 * @param (array) charge
 *
 * @returns grouped line items by common property "box_subscription_id"
 */
export const reconcileGetGrouped = async ({ charge }) => {

  const grouped = {};

  /* We can group a set of line_items to belong to a single box using the
   * `box_subscription_id`
   * group the line_items by a common box_subscription_id
   *
   * { box: the box line item, includes: the other line items, charge: the parsed charge }
   */

  try {
    for (const line_item of charge.line_items) {
      //console.log(line_item);
      const box_subscription_property = line_item.properties.find(el => el.name === "box_subscription_id");
      if (!box_subscription_property) {
        // should never happen! But what to do if it does? Maybe run the subscription-create webhook script?
        // Jun 2023 Switching to updating box_subscription_id on first charge created webhook
        // Gosh 16 Jul 2023 made an order and this threw without any downstream problems
        console.log("NO BOX SUBSCRIPTION PROPERTY", charge.id, line_item.title, line_item.purchase_item_id);
        continue; // so we don't throw an error
      };
      const box_subscription_id = parseInt(box_subscription_property.value);
      if (!grouped.hasOwnProperty(box_subscription_id)) {
        grouped[box_subscription_id] = {"box": null, "included": [], "rc_subscription_ids": []}; // initilize
      };
      if (line_item.purchase_item_id === box_subscription_id) {
        grouped[box_subscription_id].box = line_item;
      } else {
        grouped[box_subscription_id].included.push(line_item);
      };
      const rc_subscription_id = {
        shopify_product_id: parseInt(line_item.external_product_id.ecommerce),
        subscription_id: parseInt(line_item.purchase_item_id),
        quantity: parseInt(line_item.quantity),
        title: line_item.title,
        price: parseFloat(line_item.unit_price) * 100,
      };
      // e.g. cronjobs.clean-subscriptoins.js
      if (Object.hasOwnProperty.call(line_item, "next_charge_scheduled_at")) {
        rc_subscription_id.next_charge_scheduled_at = line_item.next_charge_scheduled_at;
      };
      if (Object.hasOwnProperty.call(line_item, "updated_at")) {
        rc_subscription_id.updated_at = line_item.updated_at;
      };
      if (Object.hasOwnProperty.call(line_item, "cancelled_at")) {
        rc_subscription_id.updated_at = line_item.cancelled_at;
      };
      grouped[box_subscription_id].rc_subscription_ids.push(rc_subscription_id);
      grouped[box_subscription_id].charge = charge;

    };
    for (const [box_subscription_id, group] of Object.entries(grouped)) {

      const query = {
        customer_id: parseInt(group.charge.customer.id),
        address_id: parseInt(group.charge.address_id),
        scheduled_at: group.charge.scheduled_at,
        subscription_id: parseInt(box_subscription_id),
      };
      //console.log("reconcile grouped finding pending", query);
      grouped[box_subscription_id].pending = Boolean(await _mongodb.collection("updates_pending").findOne(query));
      //console.log("reconcile grouped found pending", grouped[box_subscription_id].pending);

    };
  } catch(err) {
    getLogger().error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };

  return sortObjectByKeys(grouped);
};

/*
 * @function reconcileGetGroups
 * @param (array) charges
 *
 * @returns groups of grouped line items by common property "box_subscription_id"
 * This keeps a common box together
 */
export const reconcileGetGroups = async ({ charges }) => {

  const groups = [];

  for (const charge of charges) {
    // First up we may assume that multiple boxes are present to find them we can
    // group the line_items by a common box_subscription_id
    const grouped = await reconcileGetGrouped({ charge });

    groups.push(grouped);
  };
  return groups;
};

export const reconcileChargeGroup = async ({ subscription, includedSubscriptions }) => {

  // this is the box
  // make properties into easily accessible object
  const boxProperties = subscription.properties.reduce(
    (acc, curr) => Object.assign(acc,
      {
        [`${curr.name}`]: (curr.value === null || curr.value === "None") ? "" : curr.value
      }),
    {});

  delete boxProperties["Likes"];
  delete boxProperties["Dislikes"];

  const includes = includedSubscriptions.map(el => {
    return {
      title: el.title,
      shopify_product_id: parseInt(el.external_product_id.ecommerce),
      subscription_id: el.purchase_item_id,
      quantity: el.quantity,
      properties: el.properties,
      price: el.unit_price,
      total_price: el.total_price,
    };
  });
  includes.unshift({
    title: subscription.product_title,
    shopify_product_id: parseInt(subscription.external_product_id.ecommerce),
    subscription_id: subscription.id,
    quantity: subscription.quantity,
    properties: subscription.properties,
    price: subscription.price, // should ignore this for actual price
    total_price: subscription.price, // strange but a subscription only as a single price attribute
  });

  // the scheduled box may not be added yet but we do want a box to compare against
  // We will not update the box unless it matches the scheduled date
  // XXX I need to create an aggregate pipeline to do this as now I also want
  // to get the previous box
  let fetchBox = null;
  let previousBox = null;
  let hasNextBox = false;
  const nextDeliveryDate = boxProperties["Delivery Date"];
  let days;
  if (subscription.order_interval_unit === "week") {
    days = subscription.order_interval_frequency * 7;
  } else if (subscription.order_interval_unit === "day") {
    days = subscription.order_interval_frequency;
  };

  // tried using a while loop here but failed to make it work
  let delivered = new Date(Date.parse(boxProperties["Delivery Date"]));
  const query = {
    delivered: delivered.toDateString(),
    shopify_product_id: parseInt(subscription.external_product_id.ecommerce),
    active: true
  };
  let box = await _mongodb.collection("boxes").findOne(query);
  if (box) { // do we have the next box created?
    hasNextBox = true;
    fetchBox = { ...box };
  };
  // so dial back the delivered date by the subscription interval
  delivered.setDate(delivered.getDate() - days);
  query.delivered = delivered.toDateString();

  // this should always find a box, see next note as to why it didn't
  box = await _mongodb.collection("boxes").findOne(query);
  if (box && fetchBox) {
    previousBox = { ...box };
  } else if (box) {
    fetchBox = { ...box };
  };
  /*
   * But sometimes it didn't until I realised why.
   *
   * Long before boxesapp had Recharge subscriptions I added a cronjob to clean
   * the database nightly, both to save hard drive and to avoid storing any
   * personal data (name, email etc in orders). Boxes were also included for
   * the hard drive space. So with fortnightly subscriptions the old box was
   * gone ... doh!
   *
   * So in the next couple of lines I keep trying to set a date where I can
   * find a box, and express my frustration, and just make a mock box ... I say again, doh.
   *
   * Today 24 Jun 2023 it dawned on me that I need to keep box data longer
   * (still only 7 days for orders, but 21 days for boxes).
   *
   * This all caused a lot of problems because a throw here meant that
   * subscription boxes were not correctly updated on the charge/upcoming
   * event.
   *
   */

  delivered.setDate(delivered.getDate() - days);
  query.delivered = delivered.toDateString();
  if (!previousBox) { // try one more time the last fetch may be fetchbox only
    box = await _mongodb.collection("boxes").findOne(query);
    if (box) previousBox = { ...box };
  };

  // XXX if still no current box then fudge it this can happen for **two week** subscriptions
  if (!fetchBox && previousBox) {
    fetchBox = { ...previousBox };
    previousBox = null;
  };

  // can be that no box is found (this line would throw)
  if (fetchBox && fetchBox.delivered === boxProperties["Delivery Date"]) {
    hasNextBox = true;
  };
  // create a mock box
  if (!fetchBox) {
    fetchBox = {
      shopify_title: "",
      includedProducts: [],
      addOnProducts: [],
    };
  };


  let newIncludedInThisBox = [];
  let notIncludedInThisBox = [];
  let nowAvailableAsAddOns = [];

  if (previousBox) {
    newIncludedInThisBox = fetchBox.includedProducts.map(el => el.shopify_title)
      .filter(x => !previousBox.includedProducts.map(el => el.shopify_title).includes(x));
    // filter again from new addons
    notIncludedInThisBox = previousBox.includedProducts.map(el => el.shopify_title)
      .filter(x => !fetchBox.includedProducts.map(el => el.shopify_title).includes(x))
      .filter(x => !fetchBox.addOnProducts.map(el => el.shopify_title).includes(x));
    // filter again from old includes
    nowAvailableAsAddOns = fetchBox.addOnProducts.map(el => el.shopify_title)
      .filter(x => !previousBox.addOnProducts.map(el => el.shopify_title).includes(x))
      .filter(x => !previousBox.includedProducts.map(el => el.shopify_title).includes(x));
  };

  // init the boxLists for the subscription
  const boxLists = { ...boxProperties };
  // i.e Beetroot (2),Celeriac ... etc
  delete boxLists["Delivery Date"];
  delete boxLists["box_subscription_id"];

  // init arrays that we can change later
  const boxListArrays = {};

  // fix for null values
  Object.entries(boxLists).forEach(([name, product_string]) => {
    if (product_string === null) boxLists[name] = ""; // may be null from recharge
    boxListArrays[name] = product_string.split(",").map(el => el.trim()).filter(el => el !== "");
  });
  // figure out what extras should be/are in the box
  let boxIncludedExtras = boxListArrays["Including"]
    .map(el => matchNumberedString(el))
    .filter(el => el.quantity > 1)
    .map(el => ({ title: el.title, quantity: el.quantity - 1 }));
  // keeping all quantities
  let boxSwappedExtras = boxListArrays["Swapped Items"]
    .filter(el => el !== "None")
    .map(el => matchNumberedString(el))
    .map(el => ({ title: el.title, quantity: el.quantity - 1 }));
  // XXX Saw a single case where an included subscription did not appear here
  let boxAddOnExtras = boxListArrays["Add on Items"]
    .filter(el => el !== "None")
    .map(el => matchNumberedString(el));
  let boxRemovedItems = boxListArrays["Removed Items"]
    .filter(el => el !== "None")
    .map(el => matchNumberedString(el));

  // subscribedExtras are subscribed items in the package - should also be in boxListExtras
  // These can be extras of Including, extras of SwappedItems, or AddOns
  let subscribedExtras = includedSubscriptions.map(el => {
    return {
      subscription_id: el.purchase_item_id,
      shopify_product_id: parseInt(el.external_product_id.ecommerce),
      title: el.title, 
      quantity: el.quantity,
      price: el.unit_price,
      properties: el.properties,
    };
  });

  // this array to only update items that are subscribed
  const titledSubscribedExtras = subscribedExtras.map(el => el.title);

  const addOnProducts = fetchBox.addOnProducts.map(el => el.shopify_title);
  const includedProducts = fetchBox.includedProducts.map(el => el.shopify_title);

  let messages = [];
  let subscriptionUpdates = [];
  let item;
  let itemInner;
  let idx;
  let quantity;

  if (hasNextBox) {
    /* REMOVED ITEMS one only is allowed with the matching swap */
    for  (const item of [ ...boxRemovedItems ]) {
      if (includedProducts.indexOf(item.title) === -1) { // not included this week
        // remove from removedItem list
        boxRemovedItems = boxRemovedItems.filter(el => el.title !== item.title);
        messages.push(`Removed item ${item.title} not in this weeks box.`);
        for (itemInner of [ ...boxSwappedExtras ]) {
          quantity = itemInner.quantity;
          if (quantity === 0) {
            // only a swap and no subscribed item
            boxSwappedExtras = boxSwappedExtras.filter(el => el.title !== itemInner.title);
            messages.push(`Swapped item ${itemInner.title} not swapped this week.`);
          } else {
            if (addOnProducts.indexOf(itemInner.title) === -1) { // not included this week
              // drop the subscription altogether
              messages.push(`Extra swapped item ${itemInner.title} not available this week.`);
              boxSwappedExtras = boxSwappedExtras.filter(el => el.title !== itemInner.title);
              itemInner.quantity = 0;
              if (titledSubscribedExtras.includes(itemInner.title)) {
                subscriptionUpdates.push(itemInner); // can later read the zero an remove subscription
              };
            } else {
              // there will be a subscription for this item we can leave as is but remove from swap list
              if (titledSubscribedExtras.includes(itemInner.title)) {
                boxSwappedExtras = boxSwappedExtras.filter(el => el.title !== itemInner.title);
                messages.push(`Extra swapped item ${itemInner.title} included as an add on this week.`);
                boxAddOnExtras.push(itemInner);
              } else {
                messages.push(`${itemInner.title} removed because has no matching subscription.`);
              };
            };
          };
        };
      };
    };

    const tempBoxRemovedItems = [ ...boxRemovedItems ];

    /* SWAPPED ITEMS two only is allowed with the matching swap */
    for (const item of [ ...boxSwappedExtras ]) {
      if (addOnProducts.indexOf(item.title) === -1) { // not included this week
        boxSwappedExtras = boxSwappedExtras.filter(el => el.title !== item.title);
        if (includedProducts.indexOf(item.title) === -1) {
          // drop the subscription altogether
          messages.push(`Swapped item ${item.title} not available this week.`);
          // need to fix the removed items then
          if (item.quantity > 0) { // has a subscribed item extra
            item.quantity = 0;
            if (titledSubscribedExtras.includes(item.title)) {
              subscriptionUpdates.push(item); // can later read the zero an remove subscription
            } else {
              messages.push(`Extra ${item.title} removed because has no matching subscription.`);
            };
          };
        } else {
          // the swap is in included products, if a subscription move to addons else remove
          messages.push(`Swapped item ${item.title} already included this week.`);
          if (item.quantity > 0) { // has a subscribed item extra
            if (titledSubscribedExtras.includes(item.title)) {
              if (includedProducts.indexOf(item.title) === -1) { // not included this week
                messages.push(`Extra swapped item ${item.title} included as an add on this week.`);
                boxAddOnExtras.push(item);
              } else {
                messages.push(`Extra swapped item ${item.title} moved to included extra this week.`);
                boxIncludedExtras.push(item);
              };
            } else {
              messages.push(`Extra ${item.title} removed because has no matching subscription.`);
            };
          };
        };
        let removed = tempBoxRemovedItems.pop();
        let product = fetchBox.includedProducts.find(el => el.shopify_title === removed.title);
        let swaps = fetchBox.addOnProducts.filter(el => {
            if (el.shopify_tag === product.shopify_tag) {
              return ((product.shopify_price - 50 <= el.shopify_price) && (el.shopify_price <= product.shopify_price + 50));
            } else {
              return false;
            };
          });
        if (swaps.length) {
          // if one of these are in subscribed extras then we could substitute for the remove
          // pick one not already included let difference = arrA.filter(x => !arrB.includes(x));
          let possible = swaps.map(el => el.shopify_title)
            .filter(x => !subscribedExtras.map(el => el.title).includes(x))
            .filter(x => !boxSwappedExtras.map(el => el.title).includes(x));
          if (possible.length) {
            let title = possible[Math.floor(Math.random() * possible.length)];
            boxSwappedExtras.push({title, quantity: 0});
            messages.push(`Swapped ${title} for your removed item ${removed.title} this week.`);
          } else {
            messages.push(`Unable to find a swap item for ${item.title} so it remains in your box this week.`);
          };
        };
      };
    };

    /* EXTRA INCLUDED ITEMS */
    for (const item of [ ...boxIncludedExtras ]) {
      if (includedProducts.indexOf(item.title) === -1) { // not included this week
        boxIncludedExtras = boxIncludedExtras.filter(el => el.title !== item.title);
        if (addOnProducts.indexOf(item.title) === -1) {
          messages.push(`Included extra item ${item.title} unavailable this week.`);
          item.quantity = 0;
          if (titledSubscribedExtras.includes(item.title)) {
            subscriptionUpdates.push(item); // can later read the zero an remove subscription
          };
        } else {
          if (titledSubscribedExtras.includes(item.title)) {
            boxAddOnExtras.push(item);
            messages.push(`Included extra item ${item.title} included as an addon this week.`);
          } else {
            messages.push(`Add on ${item.title} removed because has no matching subscription.`);
          };
        };
      } else {
        if (!titledSubscribedExtras.includes(item.title)) {
          boxIncludedExtras = boxIncludedExtras.filter(el => el.title !== item.title);
          messages.push(`Extra ${item.title} removed because has no matching subscription.`);
        };
      };
    };

    /* ADD ON ITEMS */
    for (const item of [ ...boxAddOnExtras ]) {
      if (addOnProducts.indexOf(item.title) === -1) { // not included this week
        boxAddOnExtras = boxAddOnExtras.filter(el => el.title !== item.title);
        if (includedProducts.indexOf(item.title) === -1) {
          messages.push(`Add on item ${item.title} unavailable this week.`);
          item.quantity = 0;
          if (titledSubscribedExtras.includes(item.title)) {
            subscriptionUpdates.push(item); // can later read the zero an remove subscription
          };
        } else {
          if (item.quantity > 1) {
            item.quantity = item.quantity - 1;
            if (titledSubscribedExtras.includes(item.title)) {
              boxIncludedExtras.push(item);
              messages.push(`Add on item ${item.title} included as an extra this week.`);
            } else {
              messages.push(`Add on ${item.title} removed because has no matching subscription.`);
            };
          } else {
            item.quantity = 0;
            messages.push(`Add on item ${item.title} already included so removed as an add on.`);
          };
          if (titledSubscribedExtras.includes(item.title)) {
            subscriptionUpdates.push(item);
          } else {
            messages.push(`Add on ${item.title} removed because has no matching subscription.`);
          };
        };
      } else {
        if (!titledSubscribedExtras.includes(item.title)) {
          boxAddOnExtras = boxAddOnExtras.filter(el => el.title !== item.title);
          messages.push(`Add on ${item.title} removed because has no matching subscription.`);
        };
      };
    };
  };

  // Kinda wierd but some edge cases leave these out of sync e.g. if both are not in addons
  // Fingers crossed that any quantity increment is already taken care of
  if (boxSwappedExtras.length !== boxRemovedItems.length) {
    if (boxRemovedItems.length === 0) boxSwappedExtras = []; // just remove them
    const diff = Math.abs(boxRemovedItems.length - boxSwappedExtras.length);
    if (boxSwappedExtras.length > boxRemovedItems.length) {
      // the ones removed
      const extras = boxSwappedExtras.slice(boxSwappedExtras.length - diff);
      boxSwappedExtras = boxSwappedExtras.slice(0, boxSwappedExtras.length - diff); // trim to correct length
      // get the others out and check for incremented value and move to add on items!!
      for (const item of extras) {
        if (item.quantity > 1) {
          if (titledSubscribedExtras.includes(item.title)) {
            if (includedProducts.indexOf(item.title) === -1) { // not included this week
              messages.push(`Extra swapped item ${item.title} included as an add on this week.`);
              boxAddOnExtras.push(item);
            } else {
              messages.push(`Extra swapped item ${item.title} moved to included extra this week.`);
              boxIncludedExtras.push(item);
            };
          } else {
            messages.push(`Extra ${item.title} removed because has no matching subscription.`);
          };
        };
      };
    } else {
      // this just works - see below collecting included items
      boxRemovedItems = boxRemovedItems.slice(0, boxRemovedItems.length - diff); // trim to correct length
    }

    const priceMap = Object.assign({}, ...([ ...fetchBox.addOnProducts, ...fetchBox.includedProducts ]
        .map(item => ({ [item.shopify_title]: item.shopify_price }) )));

    // work through the subscription updates to update quantities
    for (const [idx, update] of [ ...subscriptionUpdates ].entries()) {
      const lineItem = subscribedExtras.find(el => el.title === update.title);
      if (lineItem) {
        lineItem.quantity = update.quantity;
        subscriptionUpdates[idx] = lineItem;
      } else {
        // XXX not a subscribed item - remove from updates
        subscriptionUpdates.slice(idx, 1);
      };
    };

    // use the occassion to update price because price changes are picked up by the boxes
    for (const item of subscribedExtras) {
      if (item.quantity > 0) {
        const checkPrice = parseFloat(priceMap[item.title]) * 0.01;
        const oldPrice = item.price;
        if (checkPrice !== parseFloat(item.price)) {
          item.price = `${checkPrice.toFixed(2)}`;
          //item.total_price = `${(checkPrice * item.quantity).toFixed(2)}`;
          subscriptionUpdates.push(item);
          messages.push(`${item.title} price has this week changed from $${oldPrice} to $${item.price}.`);
        };
      };
    };

  }; /* END hasNextBox = true */

  // helper method
  const makeItemString = (list, join) => {
    return list.map(el => {
      return `${el.title}${el.quantity > 1 ? ` (${el.quantity})` : ""}`;
    }).sort().join(join);
  };

  // when pushing swapped items back to lists bring the quantity back up
  boxSwappedExtras = boxSwappedExtras.map(el => {
    const item = { ...el };
    item.quantity = el.quantity + 1;
    return item;
  });

  // merge the includedextras with the actual listing
  const tempIncludedExtras = boxIncludedExtras.map(el => el.title);
  const boxIncludes = includedProducts
    .filter(el => !boxRemovedItems.find(item => item.title === el))
    .map(el => {
    let item;
    if (tempIncludedExtras.includes(el)) {
      item = boxIncludedExtras.find(x => x.title === el);
      item.quantity = item.quantity + 1;
    } else {;
      item = {title: el, quantity: 1};
    };
    return item;
  });

  // add the box subscription itself to the updates required
  // can we push this through to the front end when customer, or admin goes to their update
  let finalProperties;
  // no fetchBox found
  if (fetchBox.shopify_title === "") {
    finalProperties = { ...boxProperties };
  } else {
    finalProperties = {
      //"Delivery Date": fetchBox.delivered,
      "Delivery Date": boxProperties["Delivery Date"],
      "Including": makeItemString(boxIncludes, ","),
      "Add on Items": makeItemString(boxAddOnExtras, ","),
      "Swapped Items": makeItemString(boxSwappedExtras, ","),
      "Removed Items": makeItemString(boxRemovedItems, ","),
    };
  };

  const updateProperties = { ...finalProperties };
  updateProperties.box_subscription_id = `${subscription.id}`;

  const templateKeys = [
    "address_id",
    "charge_interval_frequency",
    "expire_after_specific_number_of_charges",
    "next_charge_scheduled_at",
    "order_day_of_month",
    "order_day_of_week",
    "order_interval_frequency",
    "order_interval_unit",
  ];
  const templateSubscription = {};
  for (const templateKey of templateKeys) {
    templateSubscription[templateKey] = subscription[templateKey];
  };
  // gather further data into subsciprionUpdates from includes
  for (const [idx, item] of [ ...subscriptionUpdates ].entries()) {
    const found = includes.find(el => el.title === item.title);
    if (found) {
      subscriptionUpdates[idx] = { ...found, ...item };
    }
  };
  if (!isEqual(boxProperties, updateProperties)) {
    subscriptionUpdates.push({
      subscription_id: subscription.id,
      shopify_product_id: parseInt(subscription.external_product_id.ecommerce),
      title: subscription.product_title, 
      quantity: subscription.quantity,
      price: subscription.price,
      total_price: subscription.price,
      properties: Object.entries(updateProperties).map(([name, value]) => ({name, value})),
    });
  };

  let lastOrder;
  try {
    const orderQuery = {
      customer_id: subscription.customer_id,
      address_id: subscription.address_id,
      product_id: parseInt(subscription.external_product_id.ecommerce),
      subscription_id: subscription.id,
    };
    lastOrder = await getLastOrder(orderQuery);
  } catch(err) {
    lastOrder = {};
  };

  // no box so no way we can figure updates
  if (fetchBox.shopify_title === "") {
    messages = [];
    subscriptionUpdates = [];
  };

  // we need a box for ui display, so without a fetchBox we can try again for a previousBox
  // user can only pause for at most 2 weeks so this should always be successful
  // but I'll try at least once more
  if (!previousBox) {
    delivered.setDate(delivered.getDate() - days);
    query.delivered = delivered.toDateString();
    box = await _mongodb.collection("boxes").findOne(query);
    if (box) {
      previousBox = { ...box };
    } else {
      // one more time
      delivered.setDate(delivered.getDate() - days);
      query.delivered = delivered.toDateString();
      box = await _mongodb.collection("boxes").findOne(query);
      if (box) previousBox = { ...box };
    };
  };

  return {
    fetchBox,
    previousBox,
    hasNextBox,
    nextDeliveryDate,
    boxProperties,
    finalProperties,
    subscribedExtras,
    subscriptionUpdates,
    templateSubscription,
    messages,
    includes,
    notIncludedInThisBox, // items no longer in this next delivery
    newIncludedInThisBox, // items new to this next delivery
    nowAvailableAsAddOns, // items new as addons
    lastOrder,
  };
};

/*
 * @function gatherData
 * @returns { grouped }
 */
export const gatherData = async ({ grouped, result }) => {

  for (const group of Object.values(grouped)) {

    const charge = group.charge;

    // here just a line_item object
    const includedSubscriptions = group.included;
    const chargeDate = new Date(Date.parse(charge.scheduled_at));
    const nextChargeDate = getNZDeliveryDay(chargeDate.getTime());

    let subscription;
    // XXX in order to get the frequency I need to get the actual subscription
    if (!Object.hasOwnProperty.call(group, "subscription")) {
      const item_id = Object.hasOwnProperty.call(group.box, "purchase_item_id")
        ? group.box.purchase_item_id : group.box.id;

      // XXX try/catch?
      const res = await makeRechargeQuery({
        path: `subscriptions/${item_id}`,
        title: group.box.title
      });
      subscription = res.subscription;
    } else {
      subscription = group.subscription;
    };

    // subscription.purchase_item_id === actual subscription.id
    // XXX in order to get the frequency I need to get the actual subscription
    const frequency = `Delivery every ${
      subscription.order_interval_frequency
    } ${
      subscription.order_interval_unit
    }${
      subscription.order_interval_frequency > 1 ? "s" : ""}`;

    let days;
    if (subscription.order_interval_unit === "week") {
      days = subscription.order_interval_frequency * 7;
    } else if (subscription.order_interval_unit === "day") {
      days = subscription.order_interval_frequency;
    };

    const address = charge.shipping_address;
    address.name = `${charge.shipping_address.first_name} ${charge.shipping_address.last_name}`;
    //address.name = `${charge.billing_address.first_name} ${charge.billing_address.last_name}`;

    const isEditable = chargeDate > new Date();

    const {
      fetchBox,
      previousBox,
      hasNextBox,
      nextDeliveryDate,
      boxProperties,
      finalProperties,
      subscribedExtras,
      subscriptionUpdates,
      templateSubscription,
      messages,
      includes,
      notIncludedInThisBox,
      newIncludedInThisBox,
      nowAvailableAsAddOns,
      lastOrder,
    } = await reconcileChargeGroup({
      subscription, includedSubscriptions
    });

    // darn these don't have all the data
    const updates = subscriptionUpdates.map(el => {
      return {
        subscription_id: el.subscription_id, // missing
        quantity: el.quantity,
        properties: el.properties, // missing
        title: el.title,
        shopify_product_id: el.shopify_product_id, // missingg
        price: el.price, // missing
      };
    });

    if (updates.length > 0) {
      // need to adjust rc_subscription_ids
      const rc_subscription_ids = [ ...group.rc_subscription_ids ];
      for (const update of updates) {
        const rc_subscription = rc_subscription_ids.find(el => el.subscription_id === update.subscription_id);
        if (rc_subscription) {
          rc_subscription.quantity = update.quantity;
        };
      };
      group.rc_subscription_ids = rc_subscription_ids;
    };

    const totalPrice = includes.map(el => parseFloat(el.price) * el.quantity).reduce((sum, el) => sum + el, 0);
    const attributes = {
      nextChargeDate,
      nextDeliveryDate,
      hasNextBox,
      title: subscription.product_title,
      variant: subscription.variant_title,
      pending: group.pending,
      frequency,
      days,
      scheduled_at: group.charge.scheduled_at,
      subscription_id: subscription.id,
      templateSubscription,
      rc_subscription_ids: group.rc_subscription_ids.sort(),
      charge_id: group.charge.id,
      address_id: group.charge.address_id,
      customer: group.charge.customer,
      lastOrder,
      totalPrice: `${totalPrice.toFixed(2)}`,
      notIncludedInThisBox,
      newIncludedInThisBox,
      nowAvailableAsAddOns,
    };

    if (!hasNextBox) {
      // must have a box to render the products display and prices, images etc
      fetchBox.shopify_title = subscription.product_title;
      fetchBox.shopify_product_id = parseInt(subscription.external_product_id.ecommerce);
      fetchBox.delivered = nextDeliveryDate;
      fetchBox.shopify_price = subscription.price;
      if (previousBox) {
        //fetchBox.previousBox = previousBox.delivered;
        // what to do if this fails
        fetchBox.includedProducts = previousBox.includedProducts;
        fetchBox.addOnProducts = previousBox.addOnProducts;
      };
    };

    result.push({
      box: fetchBox,
      properties: finalProperties,
      messages,
      address,
      attributes,
      updates,
      includes,
      removed: [],
    });
  };
  return result;
};
