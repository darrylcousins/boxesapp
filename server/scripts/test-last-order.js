import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { MongoClient, ObjectID } from "mongodb";
import { getMongoConnection, MongoStore } from "../src/lib/mongo/mongo.js";
import { getLastOrder } from "../src/lib/recharge/helpers.js";

global._filename = (_meta) => _meta.url.split("/").pop();
dotenv.config({ path: path.resolve(_filename(import.meta), '../.env') });
global._logger = console;
global._mongodb;
_logger.notice = (e) => console.log(e);

/**
 * Simple template for node script
 */

const run = async () => {
  console.log('This tried');

  global._mongodb = await getMongoConnection();
  try {
    console.log('this ran');

    const lastOrder = await getLastOrder({
      customer_id: 92246175,
      address_id: 100639975,
      product_id: 7051680874636,
      subscription_id: 269571096,
    });

    console.log(lastOrder);

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





