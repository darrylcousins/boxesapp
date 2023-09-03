/*
 * @module api/order/get-reconciled-box.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { matchNumberedString } from "../../lib/helpers.js";
import { getNZDeliveryDay, weekdays } from "../../lib/dates.js";
import { makeShopQuery } from "../../lib/shopify/helpers.js";
import { ObjectID } from "mongodb";

/*
 * @function order/get-reconciled-box.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {
  // get current box by selected date and shopify product id
  const collection = _mongodb.collection("boxes");
  const response = Array();
  const deliveryDay = getNZDeliveryDay(req.params.timestamp);
  // product_id(entifier) can be shopify_title or shopify_product_id
  const product_identifier = parseInt(req.params.product_id);
  const order_id = req.params.order_id ? ObjectID(req.params.order_id) : null;
  const update = req.query.update;
  const query = {
    delivered: deliveryDay
  };
  if (isNaN(product_identifier)) {
    query.shopify_title = req.params.product_id;
  } else {
    query.shopify_product_id = product_identifier;
  };
  try {
    const box = await _mongodb.collection("boxes").findOne(query);

    let order;
    let boxLists;
    if (order_id) {
      order = await _mongodb.collection("orders").findOne({ _id: order_id });
      // reconcile box with the order or return the box
      boxLists = {
        "Including": [ ...order.including ], 
        "Add on Items": [ ...order.addons ], 
        "Removed Items": [ ...order.removed ], 
        "Swapped Items": [ ...order.swaps ], 
      };
    } else {
      // creating and order: just return the box, will reconcile without changes
      boxLists = {
        //"Including": [], 
        "Including": box.includedProducts.map(el => el.shopify_title), 
        "Add on Items": [],
        "Removed Items": [],
        "Swapped Items": [],
      };
    };

    // need to get the variant for the box
    const day = new Date(parseInt(req.params.timestamp));
    const path = `products/${box.shopify_product_id}.json`;
    const fields = ["id", "variants"];
    const { variant } = await makeShopQuery({path, fields, title: "Product detail"})
      .then(async ({product}) => {
        const title = weekdays[day.getDay()];
        return {
          variant: product.variants.find(el => el.title === title),
        };
      });
    box.variant_id = variant.id;
    box.variant_title = variant.title;
    box.variant_name = `${box.shopify_title} - ${variant.title}`;;

    // init the boxLists for the subscription
    const boxListArrays = { ...boxLists };
    // i.e Beetroot (2),Celeriac ... etc

    // init arrays that we can change later
    const boxIncludedExtras = boxListArrays["Including"]
      .map(el => matchNumberedString(el))
      .filter(el => el.quantity > 1)
      .map(el => ({ title: el.title, quantity: el.quantity - 1 }));
    // keeping all quantities
    let boxSwappedExtras = boxListArrays["Swapped Items"]
      .map(el => matchNumberedString(el))
      .map(el => ({ title: el.title, quantity: el.quantity - 1 }));
    let boxAddOnExtras = boxListArrays["Add on Items"]
      .map(el => matchNumberedString(el));
    const boxRemovedItems = boxListArrays["Removed Items"]
      .map(el => matchNumberedString(el));

    const addOnProducts = box.addOnProducts.map(el => el.shopify_title);
    const includedProducts = box.includedProducts.map(el => el.shopify_title);

    const messages = [];
    let item;
    let idx;

    // this where I need to break the algorithm if we haven't been asked for an update

    /* REMOVED ITEMS one only is allowed with the matching swap */
    for  ([idx, item] of boxRemovedItems.entries()) {
      if (item.title === "None") continue;
      if (includedProducts.indexOf(item.title) === -1) { // not included this week
        // remove from removedItem list
        boxRemovedItems.splice(idx, 1);
        messages.push(`Removed item ${item.title} not in the box.`);
        for ([idx, item] of boxSwappedExtras.entries()) {
          if (item.quantity === 0) {
            // only a swap and no subscribed item
            boxSwappedExtras.splice(idx, 1);
            messages.push(`Swapped item ${item.title} not swapped for this box.`);
          } else {
            if (addOnProducts.indexOf(item.title) === -1) { // not included this week
              // drop the subscription altogether
              messages.push(`Extra swapped item ${item.title} not available for this box.`);
              boxSwappedExtras.splice(idx, 1);
              item.quantity = 0;
            } else {
              messages.push(`Extra swapped item ${item.title} included as an add for this box.`);
              boxAddOnExtras.push(item);
            };
          };
        };
      };
    };

    const tempBoxRemovedItems = [ ...boxRemovedItems ];

    /* SWAPPED ITEMS one only is allowed with the matching swap */
    for ([idx, item] of boxSwappedExtras.entries()) {
      if (item.title === "None") continue;
      if (addOnProducts.indexOf(item.title) === -1) { // not included this week
        boxSwappedExtras.splice(idx, 1);
        if (includedProducts.indexOf(item.title) === -1) {
          // drop the subscription altogether
          messages.push(`Swapped item ${item.title} not available for this box.`);
          item.quantity = 0;
        } else {
          // the swap is in included products, move to addons else remove
          messages.push(`Swapped item ${item.title} already included in this box.`);
          if (item.quantity > 0) { // has a subscribed item extra
            messages.push(`Extra swapped item ${item.title} included as an add on for this box.`);
            boxAddOnExtras.push(item);
          };
        };
        //for ([idx, item] of boxRemovedItems.entries()) {
        let removed = tempBoxRemovedItems.pop();
        let product = box.includedProducts.find(el => el.shopify_title === removed.title);
        let swaps = box.addOnProducts.filter(el => {
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

          //.filter(x => !subscribedExtras.map(el => el.title).includes(x))
          // Careful here XXX changed to boxAddOnExtras 28 Feb 2023
          //
            .filter(x => !boxAddOnExtras.map(el => el.title).includes(x))
            .filter(x => !boxSwappedExtras.map(el => el.title).includes(x));
          if (possible.length) {
            let title = possible[Math.floor(Math.random() * possible.length)];
            boxSwappedExtras.push({title, quantity: 0});
            messages.push(`Swapped ${title} for your removed item ${removed.title} in this box.`);
          } else {
            messages.push(`Unable to find a swap item for ${item.title} so it is not swapped.`);
          };
        };
      };
    };

    /* ADD ON ITEMS */
    for ([idx, item] of boxAddOnExtras.entries()) {
      if (item.title === "None") continue;
      if (addOnProducts.indexOf(item.title) === -1) { // not included this week
        if (includedProducts.indexOf(item.title) === -1) {
          messages.push(`Add on item ${item.title} unavailable in this box.`);
          item.quantity = 0;
        } else {
          if (item.quantity > 1) {
            item.quantity = item.quantity - 1;
            boxIncludedExtras.push(item);
            messages.push(`Add on item ${item.title} included as an extra for this box.`);
          } else {
            item.quantity = 0;
            messages.push(`Add on item ${item.title} already included so removed as an add on.`);
          };
        };
        boxAddOnExtras.splice(idx, 1);
      };
    };

    /* EXTRA INCLUDED ITEMS */
    for ([idx, item] of boxIncludedExtras.entries()) {
      if (item.title === "None") continue;
      if (includedProducts.indexOf(item.title) === -1) { // not included this week
        boxIncludedExtras.splice(idx, 1);
        if (addOnProducts.indexOf(item.title) === -1) {
          messages.push(`Included extra item ${item.title} unavailable in this box.`);
          item.quantity = 0;
        } else {
          boxAddOnExtras.push(item);
          messages.push(`Included extra item ${item.title} included as an addon for this box.`);
        };
      };
    };

    const priceMap = Object.assign({}, ...([ ...box.addOnProducts, ...box.includedProducts ]
        .map(item => ({ [item.shopify_title]: item.shopify_price }) )));

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

    const boxIncludes = includedProducts.map(el => {
      let item;
      if (tempIncludedExtras.includes(el)) {
        item = boxIncludedExtras.find(x => x.title === el);
        item.quantity = item.quantity + 1;
      } else {;
        item = {title: el, quantity: 1};
      };
      return item;
    }).filter(el => !boxRemovedItems.map(el => el.title).includes(el.title));;

    const attributes = {}; // was passing images here

    // can we push this through to the front end when customer, or admin goes to their update
    // if we're not updating then return the order, else the reconciled box
    // XXX easy switch to miss when reading the code
   console.log("wtf", update);
    const properties =  !update
      ? {
        "Delivery Date": order.delivered,
        "Including": order.including.join(","), 
        "Add on Items": order.addons.join(","), 
        "Removed Items": order.removed.join(","), 
        "Swapped Items": order.swaps.join(","), 
      } : {
        "Delivery Date": box.delivered,
        "Including": makeItemString(boxIncludes, ","),
        "Add on Items": makeItemString(boxAddOnExtras, ","),
        "Swapped Items": makeItemString(boxSwappedExtras, ","),
        "Removed Items": makeItemString(boxRemovedItems, ","),
    };
    res.status(200).json({ box, properties, messages, attributes });
  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};

