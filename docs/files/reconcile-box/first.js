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

  const nextDeliveryDate = boxProperties["Delivery Date"];
  // subscription.order_interval_unit === "week" Always, boxesapp insists on it
  const days = subscription.order_interval_frequency * 7;

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

  // init the boxProps for the subscription without mutating the original
  const boxProps = { ...boxProperties };
  // i.e Beetroot (2),Celeriac ... etc
  delete boxProps["Delivery Date"];
  delete boxProps["box_subscription_id"];


  // init arrays that we can change later
  const boxListArrays = {};

  // fix for null values
  Object.entries(boxProps).forEach(([name, product_string]) => {
    if (product_string === "None" || product_string === null) product_string = ""; // may be null from recharge
    boxListArrays[name] = product_string.split(",").map(el => el.trim()).filter(el => el !== "");
  });
  // figure out what extras should be/are in the box
  let boxIncludedExtras = boxListArrays["Including"]
    .map(el => matchNumberedString(el))
    .filter(el => el.quantity > 1)
    .map(el => ({ title: el.title, quantity: el.quantity - 1 }));

  // keeping all quantities
  let boxSwappedExtras = boxListArrays["Swapped Items"]
    .map(el => matchNumberedString(el))
    .map(el => ({ title: el.title, quantity: el.quantity - 1 }));
  let boxAddOnExtras = boxListArrays["Add on Items"]
    .map(el => matchNumberedString(el));
  let boxRemovedItems = boxListArrays["Removed Items"]
    .map(el => matchNumberedString(el));
  let boxIncludedItems = boxListArrays["Including"]
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

  // careful here because these lists may be from an old box
  const addOnProducts = fetchBox.addOnProducts.map(el => el.shopify_title);
  const includedProducts = fetchBox.includedProducts.map(el => el.shopify_title);

  let messages = [];
  let subscriptionUpdates = [];
  let item;
  let itemInner;
  let idx;
  let quantity;

  if (hasNextBox) {
    /* if the includes don't match then we should update the subscription */
    // merge any swaps back in to the full list
    let currentIncludedItems = [ ...boxListArrays["Including"], ...boxListArrays["Removed Items"] ]
      .filter(el => el !== "None")
      .map(el => matchNumberedString(el))
      .map(el => el.title);
    if (!compareArrays(currentIncludedItems, includedProducts)) {
      messages.push(`Included items do not match items in the upcoming box.`);
    };

    /* REMOVED ITEMS one only is allowed with the matching swap */
    for  (const item of [ ...boxRemovedItems ]) {
      if (includedProducts.indexOf(item.title) === -1) { // not included this week
        // remove from removedItem list
        boxRemovedItems = boxRemovedItems.filter(el => el.title !== item.title);
        messages.push(`Removed item ${item.title} not in this weeks box.`);
        let swapped = false;
        for (itemInner of [ ...boxSwappedExtras ]) {
          if (swapped) continue;
          quantity = itemInner.quantity;
          if (quantity === 0) {
            // only a swap and no subscribed item
            boxSwappedExtras = boxSwappedExtras.filter(el => el.title !== itemInner.title);
            messages.push(`Swapped item ${itemInner.title} not swapped this week.`);
            swapped = true;
          } else {
            if (addOnProducts.indexOf(itemInner.title) === -1 &&
              includedProducts.indexOf(itemInner.title === -1)) { // not included this week
              // drop the subscription altogether
              messages.push(`Extra swapped item ${itemInner.title} not available this week.`);
              boxSwappedExtras = boxSwappedExtras.filter(el => el.title !== itemInner.title);
              swapped = true;
              itemInner.quantity = 0;
              if (titledSubscribedExtras.includes(itemInner.title)) {
                subscriptionUpdates.push(itemInner); // can later read the zero an remove subscription
              };
              // the following else if needs testing doing it now 16Feb
            } else if (includedProducts.indexOf(itemInner.title) > -1) { // but is in includes
              if (titledSubscribedExtras.includes(itemInner.title)) {
                messages.push(`Extra swapped item ${itemInner.title} included as an extra include for this box.`);
                boxSwappedExtras = boxSwappedExtras.filter(el => el.title !== itemInner.title);
                swapped = true;
                boxIncludedExtras.push(itemInner);
              } else {
                messages.push(`${itemInner.title} removed because has no matching subscription.`);
              };
            } else {
              // there will be a subscription for this item we can leave as is but remove from swap list
              if (titledSubscribedExtras.includes(itemInner.title)) {
                boxSwappedExtras = boxSwappedExtras.filter(el => el.title !== itemInner.title);
                swapped = true;
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
    for (const [idx, update] of Object.entries([ ...subscriptionUpdates ]).reverse()) {
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

  let boxIncludes;
  if (hasNextBox) {
    // merge the includedextras with the actual listing
    const tempIncludedExtras = boxIncludedExtras.map(el => el.title);
    boxIncludes = includedProducts
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
  } else {
    boxIncludes = boxIncludedItems; // just use the saved subscription includes
  };

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

  let lastOrder = {};
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

  const reconciled = await reconcileBoxLists(fetchBox, boxProps);

  reconciled.properties.box_subscription_id = `${subscription.id}`;

  const myUpdates = [];
  if (reconciled.messages.length > 0) {
    // push the subscription with new properties
    myUpdates.push({
      subscription_id: subscription.id,
      shopify_product_id: parseInt(subscription.external_product_id.ecommerce),
      title: subscription.product_title, 
      quantity: subscription.quantity,
      price: subscription.price,
      total_price: subscription.price,
      properties: Object.entries(updateProperties).map(([name, value]) => ({name, value})),
    });
    for (const item of reconciled.updates) {
      const sub = includedSubscriptions.find(el => el.title === item.title);
      sub.quantity = item.quantity;
      myUpdates.push({
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
    subscribedExtras,
    subscriptionUpdates: myUpdates,
    templateSubscription,
    messages: reconciled.messages,
    includes,
    notIncludedInThisBox, // items no longer in this next delivery
    newIncludedInThisBox, // items new to this next delivery
    nowAvailableAsAddOns, // items new as addons
    lastOrder,
  };
};
