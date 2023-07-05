import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { MongoClient, ObjectID } from "mongodb";
import { Shopify } from "../src/lib/shopify/index.js";
import { getMongoConnection, MongoStore } from "../src/lib/mongo/mongo.js";
import chargeUpdate from "../src/api/recharge/recharge-update-charge-date.js";


global._filename = (_meta) => _meta.url.split("/").pop();
dotenv.config({ path: path.resolve(_filename(import.meta), '../.env') });
global._logger = console;
global._mongodb;
_logger.notice = (e) => console.log(e);

/**
 * Simple template for node script
 */

import body from "../recharge.updatecharge.json" assert { type: "json" };
const run = async () => {

  global._mongodb = await getMongoConnection(); // if mongo connection required
  await Shopify.initialize(); // if shopify query required

  try {
    console.log('this ran');
    const req = {
      body
    };
    chargeUpdate(req, null, null);

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





