/*
 * @module api/recharge/reconcile-charge-group.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { sortObjectByKeys, matchNumberedString, compareArrays } from "../helpers.js";
import { getNZDeliveryDay } from "../dates.js";
import { makeRechargeQuery } from "./helpers.js";
import getLastOrder from "./get-last-order.js";
import findBoxes from "./find-boxes.js";
import isEqual from "lodash.isequal";
import { winstonLogger } from "../../../config/winston.js";
import reconcileBoxLists from "./reconcile-box-lists.js";

/* helper method because logging also is performed outside the server thread */
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

  const box_subscription_ids = []; // collect ids of items that have and Including property
  const line_items = [ ...charge.line_items ];
  // ensure the box is at the start to pick up the box subscription
  for(var x in line_items) line_items[x].variant_title !== null ? line_items.unshift(line_items.splice(x,1)[0]) : 0;
  try {
    for (const line_item of line_items) {
      const box_subscription_property = line_item.properties.find(el => el.name === "box_subscription_id");
      const box_subscription = line_item.properties.find(el => el.name === "Including");
      if (!box_subscription_property) {
        // should never happen! But what to do if it does? Maybe run the subscription-create webhook script?
        // Jun 2023 Switching to updating box_subscription_id on first charge created webhook
        // Gosh 16 Jul 2023 made an order and this threw without any downstream problems
        console.log("NO BOX SUBSCRIPTION PROPERTY", charge.id, line_item.title, line_item.purchase_item_id);
        continue; // so we don't throw an error
      };
      const box_subscription_id = parseInt(box_subscription_property.value);
      if (box_subscription) {
        box_subscription_ids.push(line_item.purchase_item_id.toString());
      };
      if (!grouped.hasOwnProperty(box_subscription_id)) {
        grouped[box_subscription_id] = {"box": null, "included": [], "rc_subscription_ids": []}; // initilize
      };
      if (line_item.purchase_item_id === box_subscription_id && box_subscription) {
        grouped[box_subscription_id].box = line_item;
        // in order to properly verify the subscription I really do need the subscription!!!
      } else if (line_item.purchase_item_id !== box_subscription_id && box_subscription) {
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
        rc_subscription_id.cancelled_at = line_item.cancelled_at;
      };
      // would like to get deliver_at in here too
      const deliveryProp = line_item.properties.find(el => el.name === "Delivery Date");
      if (deliveryProp) {
        rc_subscription_id.deliver_at = deliveryProp.value;
      };
      grouped[box_subscription_id].rc_subscription_ids.push(rc_subscription_id);
      grouped[box_subscription_id].charge = charge;
    };
    for (const id of box_subscription_ids) {
      if (!Object.keys(grouped).includes(id)) {
        grouped[id] = {"box": null, "included": [], "rc_subscription_ids": [], charge}; // initilize
      };
    };
    for (const [box_subscription_id, group] of Object.entries(grouped)) {

      const query = {
        customer_id: parseInt(group.charge.customer.id),
        address_id: parseInt(group.charge.address_id),
        scheduled_at: group.charge.scheduled_at,
        subscription_id: parseInt(box_subscription_id),
      };
      grouped[box_subscription_id].pending = Boolean(await _mongodb.collection("updates_pending").findOne(query));

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

export const reconcileChargeGroup = async ({ subscription, includedSubscriptions, charge, io }) => {

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

  const nextDeliveryDate = boxProperties["Delivery Date"];
  // subscription.order_interval_unit === "week" Always, boxesapp insists on it
  const days = subscription.order_interval_frequency * 7;

  if (io) io.emit("message", `Finding a current ${subscription.product_title} for ${nextDeliveryDate} ...`);

  // if a box matches the delivery date, then we have a next box
  // otherwise just trying to find matches
  const { fetchBox, previousBox, hasNextBox } = await findBoxes({
      nextDeliveryDate,
      days,
      shopify_product_id: parseInt(subscription.external_product_id.ecommerce),
    });

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

  let lastOrder = {};
  if (Object.hasOwn(charge, "lastOrder")) {
    // property not normally on charge but helpful to set it on charge to
    // collect it here and prevent 2 api calls - see for example
    // api/recharge-customer-subscription
    lastOrder = charge.lastOrder;
  } else {
    try {
      const orderQuery = {
        customer_id: subscription.customer_id,
        //address_id: subscription.address_id, // dropped this because if addresses are merged
        product_id: parseInt(subscription.external_product_id.ecommerce),
        subscription_id: subscription.id,
      };
      lastOrder = await getLastOrder(orderQuery, io);
    } catch(err) {
      lastOrder = {};
    };
  };

  // do we really need to run this if no nextBox??? And if I don't what happens with everything else that uses gatherData?
  // change box for example
  let reconciled;
  if (hasNextBox) {
    if (io) io.emit("message", `Reconciling to ${fetchBox.delivered} ...`);
    reconciled = await reconcileBoxLists(fetchBox, boxProperties);
    reconciled.properties.box_subscription_id = `${subscription.id}`;
  } else {
    if (io) io.emit("message", `No current box for the moment ...`);
    reconciled = { properties: boxProperties, messages: [], updates: [] };
  };

  const subscriptionUpdates = [];
  if (reconciled.messages.length > 0 && hasNextBox) { // don't collect updates unless the nextBox is present
    // push the subscription with new properties
    subscriptionUpdates.push({
      subscription_id: subscription.id,
      shopify_product_id: parseInt(subscription.external_product_id.ecommerce),
      title: subscription.product_title, 
      quantity: subscription.quantity,
      price: subscription.price,
      total_price: subscription.price,
      properties: Object.entries(reconciled.properties).map(([name, value]) => ({name, value})),
    });
    for (const item of reconciled.updates) {
      const sub = includedSubscriptions.find(el => el.title === item.title);
      sub.quantity = item.quantity;
      subscriptionUpdates.push({
        subscription_id: sub.purchase_item_id,
        shopify_product_id: parseInt(sub.external_product_id.ecommerce),
        title: sub.title, 
        quantity: sub.quantity,
        price: sub.unit_price,
        total_price: `${(parseFloat(sub.unit_price) * item.quantity).toFixed(2)}`,
        properties: sub.properties,
      });
    };
  };
  return {
    fetchBox,
    previousBox,
    hasNextBox,
    nextDeliveryDate,
    boxProperties,
    finalProperties: reconciled.properties,
    subscriptionUpdates,
    templateSubscription,
    messages: reconciled.messages, // don't issue messages if no next box to reconcile against
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
export const gatherData = async ({ grouped, result, io }) => {

  for (const group of Object.values(grouped)) {

    const charge = group.charge;

    // here just a line_item object
    const includedSubscriptions = group.included;
    const chargeDate = new Date(Date.parse(charge.scheduled_at));
    const nextChargeDate = getNZDeliveryDay(chargeDate.getTime());

    let subscription;
    // NOTE in order to get the frequency I need to get the actual subscription
    // NOTE Usually the subscription is here e.g. from verify algorithm
    if (!Object.hasOwnProperty.call(group, "subscription")) {
      let res;
      try {
        const item_id = Object.hasOwnProperty.call(group.box, "purchase_item_id")
          ? group.box.purchase_item_id : group.box.id;

        // This has failed with 404 when subscriptions have been
        // orphaned so the box_subscription_id value is dead hence the try/catch
        const title = Object.hasOwn(group.box, "product_title") ? group.box.product_title : group.box.title;
        res = await makeRechargeQuery({
          path: `subscriptions/${item_id}`,
          title: `Fetching subscription ${title} ${group.box.variant_title}`,
          io,
        });
      } catch(err) {
        getLogger().error({message: `gatherData ${err.message}`, level: err.level, stack: err.stack, meta: err});
        continue;
      };
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

    const isEditable = chargeDate > new Date();

    const {
      fetchBox,
      previousBox,
      hasNextBox,
      nextDeliveryDate,
      boxProperties,
      finalProperties,
      subscriptionUpdates,
      templateSubscription,
      messages,
      includes,
      notIncludedInThisBox,
      newIncludedInThisBox,
      nowAvailableAsAddOns,
      lastOrder,
    } = await reconcileChargeGroup({
      subscription, includedSubscriptions, charge, io,
    });

    if (io) io.emit("message", `Collecting updates ...`);
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
      if (io) io.emit("message", `Found updates ...`);
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

    const address = charge.shipping_address;
    address.name = `${charge.shipping_address.first_name} ${charge.shipping_address.last_name}`;
    //address.name = `${charge.billing_address.first_name} ${charge.billing_address.last_name}`;
    const customer = charge.customer;
    customer.first_name = charge.shipping_address.first_name;
    customer.last_name = charge.shipping_address.last_name;
    customer.name = `${charge.shipping_address.first_name} ${charge.shipping_address.last_name}`;

    const totalPrice = includes.map(el => parseFloat(el.price) * el.quantity).reduce((sum, el) => sum + el, 0);
    const attributes = {
      nextChargeDate,
      nextDeliveryDate,
      orderDayOfWeek: subscription.order_day_of_week,
      hasNextBox,
      title: subscription.product_title,
      sku: subscription.sku,
      variant: subscription.variant_title,
      variant_id: parseInt(subscription.external_variant_id.ecommerce),
      product_id: parseInt(subscription.external_product_id.ecommerce),
      pending: group.pending,
      frequency,
      days,
      scheduled_at: charge.scheduled_at,
      subscription_id: subscription.id,
      templateSubscription,
      rc_subscription_ids: group.rc_subscription_ids.sort(),
      charge_id: charge.id,
      address_id: charge.address_id,
      customer: charge.customer,
      lastOrder,
      totalPrice: `${totalPrice.toFixed(2)}`,
      boxPrice: `${parseFloat(subscription.price).toFixed(2)}`,
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
    } else {
      // need to inject the price the verify script will alert to any problems
      fetchBox.shopify_price = subscription.price;
    };

    result.push({
      box: fetchBox,
      properties: finalProperties,
      origProperties: boxProperties, // using when testing only
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
