import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { MongoClient, ObjectId } from "mongodb";
import { Shopify } from "../src/lib/shopify/index.js";
import { getMongoConnection, MongoStore } from "../src/lib/mongo/mongo.js";
import { gatherData, reconcileChargeGroup, reconcileGetGrouped } from "../src/lib/recharge/reconcile-charge-group.js";

global._filename = (_meta) => _meta.url.split("/").pop();
dotenv.config({ path: path.resolve(_filename(import.meta), '../.env') });
global._logger = console;
global._mongodb;
_logger.notice = (e) => console.log(e);

/**
 * Used to clean up after creating a test charge
 */
import charge from "../recharge.charge.json" assert { type: "json" };

const run = async () => {

  global._mongodb = await getMongoConnection(); // if mongo connection required

  const groups = [];
  const grouped = await reconcileGetGrouped(charge);

  groups.push(grouped);
  let data = [];

  for (const grouped of groups) {
    data = await gatherData({ grouped, result: data });
    for (const subscription of data.values()) {
      console.log(subscription);
      if (subscription.updates) {
        for (const u of subscription.updates) {
          console.log(u);
        };
      };
      console.log("original properties", subscription.origProperties);
      console.log("updated properties", subscription.properties);
      console.log("messages", subscription.messages);
    };
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
};

main().catch(console.error);





