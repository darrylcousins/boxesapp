import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { MongoClient, ObjectID } from "mongodb";
import { getMongoConnection, MongoStore } from "../src/lib/mongo/mongo.js";

global._filename = (_meta) => _meta.url.split("/").pop();
dotenv.config({ path: path.resolve(_filename(import.meta), '../.env') });
global._logger = console;
global._mongodb;
_logger.notice = (e, { meta }) => console.log(e, JSON.stringify(meta, null, 2));
process.env.NODE_ENV = "test";

import chargeUpdated from "../src/webhooks/recharge/charge-updated.js";
//import charge from "../json/recharge.charge.updated.json" assert { type: "json" };
import charge from "../json/recharge.charge.test.json" assert { type: "json" };

const run = async () => {
  global._mongodb = await getMongoConnection();
  try {
    const mytopic = "CHARGE_UPDATED";
    await chargeUpdated("CHARGE_UPDATED", "recharge", JSON.stringify({ charge }));

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






