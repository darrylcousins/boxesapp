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

import orderProcessed from "../src/webhooks/recharge/order-processed.js";
import order from "../recharge.order.json" assert { type: "json" };

const run = async () => {
  //global._mongodb = await getMongoConnection();
  try {
    console.log('this ran');
    const mytopic = "ORDER_PROCESSED";
    await orderProcessed("ORDER_PROCESSED", "shop", JSON.stringify(order));

  } catch(e) {
    console.error(e);
  } finally {
    //process.emit('SIGINT'); // should close mongo connection
  };
};

const main = async () => {
  await run();
};

main().catch(console.error);





