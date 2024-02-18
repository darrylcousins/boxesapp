import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { MongoClient, ObjectId } from "mongodb";
import { Shopify } from "../src/lib/shopify/index.js";
import { getMongo } from "../src/lib/mongo/mongo.js";
import { winstonLogger } from "../config/winston.js";
import { matchNumberedString, makeItemString, compareArrays } from "../src/lib/helpers.js";
import { getProductDetails } from "../src/lib/boxes.js";
import reconcileLists from "../src/api/reconcile-box.js";

const getLogger = () => {
  if (typeof _logger === "undefined") {
    return winstonLogger;
  } else {
    return _logger;
  };
};

global._filename = (_meta) => _meta.url.split("/").pop();
dotenv.config({ path: path.resolve(_filename(import.meta), '../.env') });
global._logger = console;
global._mongodb;
_logger.notice = (e) => console.log(e);

/**
 * Simple template for node script
 */

const run = async () => {

  //global._mongodb = await getMongoConnection(); // if mongo connection required
  // for winstonLogger to store to mongo we need a client in the process
  // regardless whether it is actually used in the script
  const { mongo: mongodb, client: dbClient } = await getMongo();
  global._mongodb = mongodb;

  //await Shopify.initialize(); // if shopify query required

  try {
    console.log('this ran');

    // the lists as they come in a charge or subscription as the box line_item
    let origProperties = [
      {
        "name": "Delivery Date",
        "value": "Tue Feb 20 2024"
      },
      {
        "name": "Including",
        "value": "Carrots 1kg (2),Curly Kale (2),Daikon Radish ea,Pumpkin Crown ea"
      },
      {
        "name": "Add on Items",
        "value": "Bellbird Ciabatta,Cabbage Green (2)"
      },
      {
        "name": "Swapped Items",
        "value": "Silverbeet (2),Mesclun Mix (2)"
      },
      {
        "name": "Removed Items",
        "value": "Beetroot 1kg,Chard Red"
      },
      {
        "name": "box_subscription_id",
        "value": "453883324"
      }
    ];

    // first get ourselves a box
    const box = await _mongodb.collection("boxes").findOne({ delivered: "Tue Feb 20 2024", shopify_title: "The Medium Vege Box"});
    reconcileLists(box, origProperties);
    return;

    // convert the array of properties into { name: value } object
    let properties = origProperties.reduce( // old delivery date and properties
      (acc, curr) => Object.assign(acc, {
        [`${curr.name}`]: (curr.value === null || curr.value === "" || curr.value === "None") ? []
        : curr.value.split(",").map(el => el.trim()).filter(el => el !== "")}),
      {});


    // this is actually script stuff
    // create a priceMap from all items in box
    const priceMap = Object.assign({}, ...([ ...box.addOnProducts, ...box.includedProducts ]
        .map(item => ({ [item.shopify_title.trim()]: item.shopify_price }) )));
    const availableIncludes = box.includedProducts.map(el => el.shopify_title.trim());
    const availableAddons = box.addOnProducts.map(el => el.shopify_title.trim());
    const availableProducts = [ ...availableIncludes, ...availableAddons ];

    const lists = {}; // these will be mutated?
    // decremented includes and addons to the number that should match includes
    lists["includes"] = properties["Including"]
      .map(el => matchNumberedString(el))
      .filter(el => el.quantity > 1)
      .map(el => ({ title: el.title, quantity: el.quantity - 1 }));

    lists["swaps"] = properties["Swapped Items"]
      .map(el => matchNumberedString(el))
      .map(el => ({ title: el.title, quantity: el.quantity }));

    lists["addons"] = properties["Add on Items"]
      .map(el => matchNumberedString(el));

    lists["removed"] = properties["Removed Items"]
      .map(el => matchNumberedString(el))
      .map(el => ({ title: el.title, quantity: 1 })); // keeep as ones - they are never incrementd

    let includedSubscriptions = [ 
      ...lists["includes"],
      ...lists["swaps"].map(el => ({ title: el.title, quantity: el.quantity - 1 })).filter(el => el.quantity > 0),
      ...lists["addons"] ];
    console.log("original subscriptions", includedSubscriptions);
    const updates = {};
    for (const [key, value] of Object.entries(lists)) {
      updates[key] = value.map(el => el); // copy items
    };
    updates["deletes"] = []; // to push deleted extras

    const messages = [];
    for (const name of Object.keys(lists)) { // addons, included, removed, swaps
      for (const [idx, item] of Object.entries(lists[name]).reverse()) {
        switch (availableProducts.indexOf(item.title) !== -1) {
          case false: // product unavailable in either list, neither includedProducts nor addOnProducts
            switch (name) {
              case "includes":
                item.quantity = 0;
                messages.push(`Included extra item ${item.title} unavailable in this box.`);
                lists["includes"].splice(idx, 1);
                break;
              case "addons":
                item.quantity = 0;
                messages.push(`Add on item ${item.title} unavailable in this box.`);
                lists["addons"].splice(idx, 1);
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
                    };
                    lists["addons"].splice(idx, 1); // remove from addons
                    updates["addons"].splice(updates["addons"].indexOf(item), 1); // remove from swaps
                    break;
                  case "swaps": // swaps come from addons so if now in included we can move as extra include and remove the swap
                    item.quantity -= 1;
                    if (item.quantity > 0) {
                      messages.push(`Extra swapped item ${item.title} included as an extra include for this box.`);
                      lists["swaps"].splice(idx, 1); // remove from swaps
                      updates["includes"].push(item);
                      updates["swaps"].splice(updates["swaps"].indexOf(item), 1); // remove from swaps
                    } else {
                      messages.push(`Swapped item ${item.title} already included in this box.`);
                    };
                    break;
                };
                break;
              case false: // product available and in box.addOnProducts
                switch (name) {
                  case "includes":
                    messages.push(`Included extra item ${item.title}${item.quantity > 1
                        ? ` (${item.quantity})` : ""} included as an addon for this box.`);
                    lists["addons"].push(item);
                    lists["includes"].splice(idx, 1); // remove from addons
                    updates["addons"].push(item);
                    updates["includes"].splice(updates["includes"].indexOf(item), 1); // remove from swaps
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
    console.log("here", diff);
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
            updates["removed"].push(item);
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
    /*
    console.log("original properties ===========");
    for (const [key, value] of Object.entries(properties)) {
      if (["Including", "Add on Items"].includes(key)) console.log(key, value);
    };
    console.log("lists ============")
    for (const [key, value] of Object.entries(lists)) {
      if (["includes", "addons"].includes(key)) console.log(key, value);
    };
    */
    console.log("updates ===========");
    for (const [key, value] of Object.entries(updates)) {
      console.log(key, value);
    };

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

    /*
    updates["swaps"] = updates["swaps"].map(el => { // think about this, shouldn't need to really
      const n = { title: el.title, quantity: el.quantity + 1 };
      return n;
    });
    */

    //console.log("boxIncludes", boxIncludes);
    const final = {
        "Delivery Date": box.delivered,
        "Including": makeItemString(boxIncludes.filter(el => el.quantity > 0), ","),
        "Add on Items": makeItemString(updates["addons"], ","),
        "Swapped Items": makeItemString(updates["swaps"], ","),
        "Removed Items": makeItemString(updates["removed"], ","),
    };
    console.log("original properties: ===========");
    let startProperties = origProperties.reduce( // old delivery date and properties
      (acc, curr) => Object.assign(acc, {
        [`${curr.name}`]: (curr.value === null || curr.value === "" || curr.value === "None") ? ""
        : curr.value}),
      {});
    console.log(startProperties);
    console.log("messages", messages);
    console.log("final properties: ===========");
    console.log(final);

    /* and surely include extras
    const includes = [ ...boxSwappedExtras, ...boxAddOnExtras ].map(el => el.title);

    const rc_subscription_ids = [{
      title: box.shopify_title,
      price: parseFloat(variant.price) * 100,
      shopify_product_id: box.shopify_product_id,
    }];
    const productDetails = await getProductDetails(includes);
    for (const product of productDetails) {
      delete product._id;
      delete product.tag;
      rc_subscription_ids.push(product);
    };

    // Also need to put these together:
    boxProperties, the origingal
    finalProperties, doing this now
    subscribedExtras, sort of on to this
    subscriptionUpdates, :: // becomes updates at line 696 lib/recharge/reconcile..
      return { // this is on the box subscription but others should be same esp with quantity
        subscription_id: el.subscription_id, // missing
        quantity: el.quantity,
        properties: el.properties, // missing = easy fill
        title: el.title,
        shopify_product_id: el.shopify_product_id, // missingg -- easy fill
        price: el.price, // missing -- easy fill
      };
    */

  } catch(e) {
    console.error(e);
  } finally {
    console.log("in finally");
    dbClient.close();
    process.emit('SIGINT'); // will close mongo connection
    process.exit();
  };
  return;
};

const main = async () => {
  await run();
  process.emit('SIGINT'); // will close mongo connection
};

main().catch(console.error);
