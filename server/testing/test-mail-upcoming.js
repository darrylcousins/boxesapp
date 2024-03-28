import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { MongoClient, ObjectID } from "mongodb";
import { getMongoConnection, MongoStore } from "../src/lib/mongo/mongo.js";
import { gatherData, reconcileGetGrouped } from "../src/lib/recharge/reconcile-charge-group.js";

global._filename = (_meta) => _meta.url.split("/").pop();
dotenv.config({ path: path.resolve(_filename(import.meta), '../.env') });
global._logger = console;
global._mongodb;
_logger.notice = (e) => console.log(e);

import charge from "../recharge.charge.json" assert { type: "json" };
import mail from "../src/mail/charge-upcoming.js";


const run = async () => {
  global._mongodb = await getMongoConnection();
  try {
    const grouped = await reconcileGetGrouped(charge);

    let result = [];
    result = await gatherData({ grouped, result });
    await mail({ subscriptions: result });

  } catch(e) {
    console.error(e);
  } finally {
    // hold this open if you need to see api calls and webhooks happen
    //process.emit('SIGINT'); // should close mongo connection
  };
};

const main = async () => {
  await run();
};

main().catch(console.error);





