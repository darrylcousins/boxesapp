import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { MongoClient, ObjectId } from "mongodb";
import { getMongoConnection, MongoStore } from "../src/lib/mongo/mongo.js";
import { winstonLogger } from "../config/winston.js";
import { logWebhook } from "../src/lib/recharge/helpers.js";

global._filename = (_meta) => _meta.url.split("/").pop();
dotenv.config({ path: path.resolve(_filename(import.meta), '../.env') });
global._logger = winstonLogger;
//global._logger = console;
global._mongodb;
//_logger.notice = (e, meta) => console.log(e, meta);

import orderProcessed from "../src/webhooks/recharge/order-processed.js";
import order from "../recharge.subscription.json" assert { type: "json" };

const run = async () => {
  global._mongodb = await getMongoConnection();
  try {
    console.log('this ran');
    const mytopic = "SUBSCRIPTION_PROCESSED";
    //await orderProcessed("ORDER_PROCESSED", "shop", JSON.stringify({ order: order.order }));
    await logWebhook(mytopic, order, "recharge");

  } catch(e) {
    console.error(e);
  } finally {
    process.emit('SIGINT'); // should close mongo connection
  };
};

const main = async () => {
  await run();
};

main().catch(console.error);





