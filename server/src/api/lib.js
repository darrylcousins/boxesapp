/*
 * @module api/lib
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { matchNumberedString } from "../lib/helpers.js";

/*
 * @function compareArrayElements
 *
 * A function to compare if two arrays have the same elements regardless of their order
 */
const compareArrayElements = (a, b) => {
  if (a.length !== b.length) return false;
  const elements = new Set([...a, ...b]);
  for (const x of elements) {
    const count1 = a.filter(e => e === x).length;
    const count2 = b.filter(e => e === x).length;
    if (count1 !== count2) return false;
  };
  return true;
};

/*
 * @function reconcileLists
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 *
 * Helper method used to reconcile an order against a box or a change box subscription agains a box
 * Used in api/order/get-reconciled-box and api/recharge/recharge-get-reconciled-box
 * should also go into reconcile-charge-group!! 
 */
export default async function reconcileLists(box, boxLists) {

  // this differs from reconile-charge-group which starts with the properties as strings
  // here they all aready converted to arrays or strings
  // init arrays that we can change later
  const boxListArrays = { ...boxLists };

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

  const addOnProducts = box.addOnProducts.map(el => el.shopify_title);
  const includedProducts = box.includedProducts.map(el => el.shopify_title);

  const messages = [];

  const tempBoxRemovedItems = [ ...boxRemovedItems ];
  const tempSwappedExtras = [ ...boxSwappedExtras ]; // because it gets mutated before used in possible
  const tempIncludedExtras = [ ...boxIncludedExtras ]; // because it gets mutated before used in possible
  const tempAddOnExtras = [ ...boxAddOnExtras ]; // because it gets mutated before used in possible

  // remove the quantity values and titles only
  const currentIncludes = boxListArrays["Including"]
    .map(el => matchNumberedString(el))
    .map(el => el.title);
  // match includes - could be the order has a date or box change
  if (!compareArrayElements(currentIncludes, includedProducts)) {
    messages.push("The included items do not match the box included items");
  };

  let item;
  let idx;

  // first check that the included products match, e.g. when a delivery date is
  // changed for a box then the included products may well be different and
  // also if we have had a "No delivery date" order then the included products
  // would also not have been updated
  

  /* REMOVED ITEMS one only is allowed with the matching swap */
  for  ([idx, item] of Object.entries(boxRemovedItems)) {
    if (item.title === "None") continue;
    if (includedProducts.indexOf(item.title) === -1) { // not included this week
      // remove from removedItem list
      boxRemovedItems.splice(idx, 1);
      messages.push(`Removed item ${item.title} not in the box.`);
      // so sort out the swapped item
      for ([idx, item] of Object.entries(boxSwappedExtras)) {
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
            boxSwappedExtras.splice(idx, 1); // query me - did this when looking at a custom box
            boxAddOnExtras.push(item);
          };
        };
      };
    };
  };

  /* SWAPPED ITEMS one only is allowed with the matching swap */
  for ([idx, item] of Object.entries(boxSwappedExtras)) {
    if (item.title === "None") continue;
    if (addOnProducts.indexOf(item.title) === -1) { // not included this week
      boxSwappedExtras.splice(idx, 1);
      if (includedProducts.indexOf(item.title) === -1) {
        // drop the subscription altogether
        messages.push(`Swapped item ${item.title} not available for this box.`);
        item.quantity = 0;
      } else {
        // the swap is in included products, maintain the quantity
        messages.push(`Swapped item ${item.title} already included in this box.`);
        if (item.quantity > 0) { // has a subscribed item extra
          // messages.push(`Extra swapped item ${item.title} included as an add on for this box.`);
          boxIncludedExtras.push(item);
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
          .filter(x => !tempAddOnExtras.map(el => el.title).includes(x))
          .filter(x => !tempIncludedExtras.map(el => el.title).includes(x))
          .filter(x => !tempSwappedExtras.map(el => el.title).includes(x));
        console.log(tempSwappedExtras);
        console.log(tempAddOnExtras);
        console.log(tempIncludedExtras);
        console.log(possible)
        if (possible.length) {
          let title = possible[Math.floor(Math.random() * possible.length)];
          boxSwappedExtras.push({title, quantity: 0});
          messages.push(`Swapped ${title} for your removed item ${removed.title} in this box.`);
        } else {
          messages.push(`Unable to find a swap item for ${removed.title} so it is not swapped.`);
          boxRemovedItems = [ ...tempBoxRemovedItems ];
        };
      } else {
        messages.push(`Unable to find a swap item for ${removed.title} so it is not swapped.`);
        boxRemovedItems = [ ...tempBoxRemovedItems ];
      };
    };
  };

  /* ADD ON ITEMS */
  for ([idx, item] of Object.entries([ ...boxAddOnExtras ])) {
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
          boxAddOnExtras.splice(idx, 1);
        } else {
          item.quantity = 0;
          messages.push(`Add on item ${item.title} already included so removed as an add on.`);
        };
      };
    };
  };

  /* EXTRA INCLUDED ITEMS */
  for ([idx, item] of Object.entries(boxIncludedExtras)) {
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

  const boxIncludes = includedProducts.map(el => {
    let item;
    if (boxIncludedExtras.map(el => el.title).includes(el)) {
      item = boxIncludedExtras.find(x => x.title === el);
      item.quantity = item.quantity + 1;
    } else {;
      item = {title: el, quantity: 1};
    };
    return item;
  }).filter(el => !boxRemovedItems.map(el => el.title).includes(el.title));;

  const properties = {
      "Delivery Date": box.delivered,
      "Including": makeItemString(boxIncludes, ","),
      "Add on Items": makeItemString(boxAddOnExtras.filter(el => el.quantity > 0), ","),
      "Swapped Items": makeItemString(boxSwappedExtras, ","),
      "Removed Items": makeItemString(boxRemovedItems, ","),
  };

  return { properties, messages };
};
