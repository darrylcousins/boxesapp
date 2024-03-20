import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { MongoClient, ObjectId } from "mongodb";
import { Shopify } from "../src/lib/shopify/index.js";
import { getMongo, getMongoConnection } from "../src/lib/mongo/mongo.js";
import { winstonLogger } from "../config/winston.js";
import { matchNumberedString } from "../src/lib/helpers.js";

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

import json from "../recharge.order.json" assert { type: "json" };

const run = async () => {

  // this one closes the connection on SIGINT
  global._mongodb = await getMongoConnection(); // if mongo connection required

  const order = json.order;
  const line_items = [];
  for (const line_item of order.line_items) {
    const properties = line_item.properties.reduce(
      (acc, curr) => Object.assign(acc, { [`${curr.name}`]: curr.value === null ? "" : curr.value }),
      {});
    console.log(line_item.purchase_item_id, line_item.title, line_item.quantity,  properties);
    //
    if (Object.hasOwn(properties, "Including")) {
      // create title/quantity lists
      const lists = {}; // these will be mutated?
      // decremented includes and addons to the number that should match includes
      const thisIncludes = properties["Including"]
        .split(",").filter(el => el !== "")
        .map(el => matchNumberedString(el))
        .map(el => ({ title: el.title, quantity: el.quantity - 1 }));
      lists["includes"] = thisIncludes
        .filter(el => el.quantity > 0);
      lists["swaps"] = properties["Swapped Items"]
        .split(",").filter(el => el !== "")
        .map(el => matchNumberedString(el));
      lists["addons"] = properties["Add on Items"]
        .split(",").filter(el => el !== "")
        .map(el => matchNumberedString(el));
      lists["removed"] = properties["Removed Items"]
        .split(",").filter(el => el !== "")
        .map(el => matchNumberedString(el))
        .map(el => ({ title: el.title, quantity: 1 })); // keeep as ones - they are never incrementd
      console.log(lists);
    };
    // get the lists
    // so already wrong here! why? ???
    // but what we should do is fix it
    // pick out the box subscriptions, easy fix the properties.box_subscription_id !match title first!
    // get the lists as titles/quantities
    // use these lists to find the subscription items and fix their properties
    // and each of these to line_items to replace order.line_items
  };

  try {
    console.log('this ran');

  } catch(e) {
    console.error(e);
  } finally {
    process.emit('SIGINT'); // will close mongo connection
  };
};

const main = async () => {
  await run();
  process.emit('SIGINT'); // will close mongo connection
};

main().catch(console.error);





