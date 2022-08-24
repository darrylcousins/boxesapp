import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { MongoClient, ObjectID } from "mongodb";
import { getMongoConnection, MongoStore } from "../src/lib/mongo/mongo.js";

global._filename = (_meta) => _meta.url.split("/").pop();
dotenv.config({ path: path.resolve(_filename(import.meta), '../.env') });
global._logger = console;
global._mongodb;
_logger.notice = (e) => console.log(e);

import ordersCreate from "../src/webhooks/shopify/orders-create.js";
import order from "../shopify.order.json" assert { type: "json" };


const run = async () => {
  global._mongodb = await getMongoConnection();
  try {
    console.log('this ran');
    const mytopic = "ORDERS_CREATE";
    await ordersCreate("ORDERS_CREATE", "shop", JSON.stringify(order));

  } catch(e) {
    console.error(e);
  } finally {
    process.emit('SIGINT'); // close mongo connection
  };
};

const main = async () => {
  await run();
};

main().catch(console.error);






