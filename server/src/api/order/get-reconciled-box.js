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
  const product_id = parseInt(req.params.product_id);
  const order_id = req.params.order_id ? ObjectID(req.params.order_id) : null;
  try {
    const box = await _mongodb.collection("boxes").findOne({ delivered: deliveryDay, shopify_product_id: product_id });

    let order;
    let boxLists;
    if (order_id) {
      order = await _mongodb.collection("orders").findOne({ _id: order_id });
      // reconcile box with the order
      boxLists = {
        "Including": order.including, 
        "Add on Items": order.addons, 
        "Removed Items": order.removed, 
        "Swapped Items": order.swaps, 
      };
    } else {
      boxLists = {
        "Including": [], 
        "Add on Items": [],
        "Removed Items": [],
        "Swapped Items": [],
      };
    };

    // need to get the variant for the box
    const day = new Date(parseInt(req.params.timestamp));
    const path = `products/${box.shopify_product_id}.json`;
    const fields = ["id", "variants", "images"];
    const { variant, images } = await makeShopQuery({path, fields})
      .then(async ({product}) => {
        const title = weekdays[day.getDay()];
        const src = product.images[0].src;
        return {
          variant: product.variants.find(el => el.title === title),
          images: { [box.shopify_title]: src }
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

    const setOfLikes = new Set();
    const setOfDislikes = new Set();

    // update likes and dislikes
    for (const el of boxAddOnExtras) setOfLikes.add(el.title);
    for (const el of boxRemovedItems) setOfDislikes.add(el.title);
    
    const addOnProducts = box.addOnProducts.map(el => el.shopify_title);
    const includedProducts = box.includedProducts.map(el => el.shopify_title);

    const messages = [];
    let item;
    let idx;

    /* REMOVED ITEMS one only is allowed with the matching swap */
    for  ([idx, item] of boxRemovedItems.entries()) {
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
            .filter(x => !subscribedExtras.map(el => el.title).includes(x))
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
      if (addOnProducts.indexOf(item.title) === -1) { // not included this week
        boxAddOnExtras.splice(idx, 1);
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
      };
    };

    /* EXTRA INCLUDED ITEMS */
    for ([idx, item] of boxIncludedExtras.entries()) {
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

    // to get all the images will need to use api/shopify/shopify-product-image
    // code to collect the images for each extra
    // At this point is { "box title": image_src }
    // Find all those that should have an image - i.e. those which will be in price table
    // XXX Ain't gonna work without the shopify_id
    // XXX Maybe store the image url with the order itself?
    const collectTitles = [
      ...boxIncludes.filter(el => el.quantity > 1).map(el => el.title),
      ...boxSwappedExtras.filter(el => el.quantity > 1).map(el => el.title),
      ...boxAddOnExtras.map(el => el.title),
    ];
    const attributes = { images };

    // can we push this through to the front end when customer, or admin goes to their update
    const properties = {
      "Delivery Date": box.delivered,
      "Including": makeItemString(boxIncludes, ","),
      "Add on Items": makeItemString(boxAddOnExtras, ","),
      "Swapped Items": makeItemString(boxSwappedExtras, ","),
      "Removed Items": makeItemString(boxRemovedItems, ","),
      "Likes": Array.from(setOfLikes).sort().join(","),
      "Dislikes": Array.from(setOfDislikes).sort().join(","),
    };
    res.status(200).json({ box, properties, messages, attributes });
  } catch(err) {
    res.status(400).json({ error: err.toString() });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};

