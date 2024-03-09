/*
 * @module api/reconcile-box
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import {
  matchNumberedString,
  makeItemString,
  compareArrays,
  sortObjectArrayByKey,
} from "../lib/helpers.js";


/*
 * @function reconcileBox
 *
 * Helper method used to reconcile an order against a box or a change box subscription agains a box
 * Used in api/order/get-reconciled-box and api/recharge/recharge-get-reconciled-box
 * should also go into reconcile-charge-group!! 
 */
export default async function reconcileBoxLists(box, boxLists) {

  // boxLists can be passed as array of name/value objects as stored by recharge
  let properties;
  if (Array.isArray(boxLists)) {
    // convert to more useful object of [name]: [products]
    properties = boxLists.reduce(
      (acc, curr) => Object.assign(acc, {
        [`${curr.name}`]: (curr.value === null || curr.value === "" || curr.value === "None") ? []
        : curr.value.split(",").map(el => el.trim()).filter(el => el !== "")}),
      {});
  } else {
    if (!Array.isArray(boxLists["Including"])) {
      // boxLists can also be passed as object but values still a strings as stored by recharge
      properties = {};
      for (const [key, value] of Object.entries(boxLists)) {
        properties[key] = value.split(",").map(el => el.trim()).filter(el => el !== "");
      };
    } else {
      // finally boxList can an object with values already split into arrays
      properties = boxLists;
    };
  };

  // get title only lists from the box
  const availableIncludes = box.includedProducts.map(el => el.shopify_title.trim());
  const availableAddons = box.addOnProducts.map(el => el.shopify_title.trim());
  const availableProducts = [ ...availableIncludes, ...availableAddons ];

  // create title/quantity lists
  const lists = {}; // these will be mutated?
  // decremented includes and addons to the number that should match includes
  const thisIncludes = properties["Including"]
    .map(el => matchNumberedString(el))
    .map(el => ({ title: el.title, quantity: el.quantity - 1 }));
  lists["includes"] = thisIncludes
    .filter(el => el.quantity > 0);
  lists["swaps"] = properties["Swapped Items"]
    .map(el => matchNumberedString(el));
  lists["addons"] = properties["Add on Items"]
    .map(el => matchNumberedString(el));
  lists["removed"] = properties["Removed Items"]
    .map(el => matchNumberedString(el))
    .map(el => ({ title: el.title, quantity: 1 })); // keeep as ones - they are never incrementd

  const updates = {};
  for (const [key, value] of Object.entries(lists)) {
    updates[key] = value.map(el => el); // copy items
  };
  updates["deletes"] = []; // to push deleted extras

  const messages = [];
  if (!compareArrays([ ...thisIncludes, ...lists["removed"] ].map(el => el.title), availableIncludes)) {
    messages.push("The included items do not match the box included items");
  };

  // first run deals with just removing or moving items
  // it will leave the possibility of mismatched swaps and removed lists
  for (const name of Object.keys(lists)) { // addons, included, removed, swaps
    for (const [idx, item] of Object.entries(lists[name]).reverse()) {
      switch (availableProducts.indexOf(item.title) !== -1) {
        case false: // product unavailable in either list, neither includedProducts nor addOnProducts
          switch (name) {
            case "includes":
              item.quantity = 0;
              messages.push(`Included extra item ${item.title} unavailable in this box.`);
              lists["includes"].splice(idx, 1);
              updates["deletes"].push(item);
              break;
            case "addons":
              item.quantity = 0;
              messages.push(`Add on item ${item.title} unavailable in this box.`);
              lists["addons"].splice(idx, 1);
              updates["deletes"].push(item);
              break;
            case "swaps":
              if (item.quantity > 1) {
                item.quantity = 0;
                messages.push(`Extra swapped item ${item.title} not available for this box.`);
                updates["deletes"].push(item);
              } else {
                messages.push(`Swapped item ${item.title} not available for this box.`);
              };
              lists["swaps"].splice(idx, 1);
              updates["swaps"].splice(updates["swaps"].indexOf(item), 1); // remove from swaps
              break;
            case "removed":
              messages.push(`Removed item ${item.title} not in the box.`);
              lists["removed"].splice(idx, 1);
              updates["removed"].splice(updates["removed"].indexOf(item), 1); // remove from removed
              break;
            };
          break;
        case true:
          const included = availableIncludes.indexOf(item.title) !== -1;
          switch (included) {
            case true: // product available and in box.includedProducts
              switch (name) {
                case "includes":
                  // no action required
                  break;
                case "addons":
                  item.quantity -= 1;
                  if (item.quantity > 0) {
                    messages.push(`Add on item ${item.title} included as an extra for this box.`);
                    updates["includes"].push(item);
                  } else {
                    messages.push(`Add on item ${item.title} already included so removed as an add on.`);
                    updates["deletes"].push(item);
                  };
                  lists["addons"].splice(idx, 1); // remove from addons
                  updates["addons"].splice(updates["addons"].indexOf(item), 1); // remove from swaps
                  break;
                case "swaps": // swaps come from addons so if now in included we can move as extra include and remove the swap
                  item.quantity -= 1;
                  if (item.quantity > 0) {
                    messages.push(`Extra swapped item ${item.title} included as an extra include for this box.`);
                    updates["includes"].push(item);
                  } else {
                    messages.push(`Swapped item ${item.title} already included in this box.`);
                  };
                  lists["swaps"].splice(idx, 1); // remove from swaps
                  updates["swaps"].splice(updates["swaps"].indexOf(item), 1); // remove from swaps
                  break;
              };
              break;
            case false: // product available and in box.addOnProducts
              switch (name) {
                case "includes":
                  messages.push(`Included extra item ${item.title}${item.quantity > 1
                      ? ` (${item.quantity})` : ""} included as an addon for this box.`);
                  lists["addons"].push(item); // keep quantity on list
                  lists["includes"].splice(idx, 1); // remove from addons
                  updates["includes"].splice(updates["includes"].indexOf(item), 1); // remove from includes
                  // need to decrease as for with extra swaps
                  updates["addons"].push({ title: item.title, quantity: item.quantity - 1 });
                  //updates["addons"].push(item); // replace by the above line to fix problem?
                  break;
                case "addons":
                  // do nothing
                  break;
                case "removed": // removed come from includes so if now in addons we can remove it
                  item.quantity = 0; // as a marker for updates
                  messages.push(`Removed item ${item.title} not included in the box.`);
                  lists["removed"].splice(idx, 1);
                  updates["removed"].splice(updates["removed"].indexOf(item), 1); // remove from swaps
                  break;
              };
              break;
          }
          break;
        default:
          console.log("end of switch and in default");
      };
    };
  };
  // Now I'm left with possibly a broken match of swaps and removed
  // All I need to deal with are swaps that are now included
  // And removed that are now addons because all other possibilities are taken care of
  let diff = Math.abs(updates["swaps"].length - updates["removed"].length);
  let item;
  if (diff > 0) {
    while (diff > 0) {
      if (updates["swaps"].length > updates["removed"].length) {
        // swaps just take them out until we're done, we have have established above that it is available in addons only
        item = updates["swaps"].pop();
        item.quantity -= 1;
        if (item.quantity > 0) {
          messages.push(`Extra swapped item ${item.title} included as an addon for this box.`);
          updates["addons"].push(item);
        } else {
          messages.push(`Swapped item ${item.title} not swapped for this box.`);
        };
      } else {
        // removed however, need to add a swap in if possible, before taking it out
        item = updates["removed"].pop();
        const boxItem = box.includedProducts.find(el => el.shopify_title === item.title);
        // need to find a replacement swap for this
        const possibleSwaps = box.addOnProducts.filter(el => (el.shopify_tag === boxItem.shopify_tag 
            && boxItem.shopify_price - 50 <= el.shopify_price
            && el.shopify_price <= boxItem.shopify_price + 50)
        ).filter(el => ![ ...updates["addons"], ...updates["swaps"] ].map(e => e.title).includes(el.shopify_title));
        if (possibleSwaps.length > 0) {
          updates["removed"].unshift(item); // to front
          let swap = possibleSwaps.pop();
          updates["swaps"].push({ title: swap.shopify_title, quantity: 1});
          messages.push(`Swapped ${swap.shopify_title} for your removed item ${item.title} in this box.`);
        } else {
          messages.push(`Unable to find a swap item for ${item.title} so it is not swapped.`);
        };
      };
      diff--;
    };
  };
  // these should match the extra subscribed items and will register deletions with zerod quantity
  const includedSubscriptions = sortObjectArrayByKey([ 
    ...updates["includes"],
    ...updates["swaps"].filter(el => el.quantity > 1).map(el => ({ title: el.title, quantity: el.quantity - 1 })),
    ...updates["addons"] ], "title");

  const boxIncludes = availableIncludes.map(el => {
    let item;
    if (updates["includes"].map(el => el.title).includes(el)) {
      item = updates["includes"].find(x => x.title === el);
      item.quantity = item.quantity + 1;
    } else {;
      item = {title: el, quantity: 1};
    };
    return item;
  }).filter(el => !updates["removed"].map(el => el.title).includes(el.title));;

  const finalProperties = {
      "Delivery Date": box.delivered,
      "Including": makeItemString(boxIncludes.filter(el => el.quantity > 0), ","),
      "Add on Items": makeItemString(updates["addons"].filter(el => el.quantity > 0), ","),
      "Swapped Items": makeItemString(updates["swaps"], ","),
      "Removed Items": makeItemString(updates["removed"], ","),
  };

  return {
    properties: finalProperties,
    messages, 
    subscriptions: includedSubscriptions.filter(el => el.quantity > 0), // excludes the zerod items
    updates: updates["deletes"], // zerod items only
  };
};
