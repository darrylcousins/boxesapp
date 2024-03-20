import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { MongoClient, ObjectId } from "mongodb";
import { getMongoConnection, MongoStore } from "../src/lib/mongo/mongo.js";
import { winstonLogger } from "../config/winston.js";

global._filename = (_meta) => _meta.url.split("/").pop();
dotenv.config({ path: path.resolve(_filename(import.meta), '../.env') });
global._logger = winstonLogger;
global._mongodb;

import chargeUpcoming from "../src/webhooks/recharge/charge-upcoming.js";
import charge from "../recharge.charge.json" assert { type: "json" };

const run = async () => {
  global._mongodb = await getMongoConnection();
  try {
    await chargeUpcoming("CHARGE_UPCOMING", "shop", JSON.stringify(charge));
  } catch(e) {
    console.error(e);
  } finally {
    // hold this open if you need to see api calls and webhooks happen
    process.emit('SIGINT'); // should close mongo connection
  };
};

const main = async () => {
  await run();
};

main().catch(console.error);




