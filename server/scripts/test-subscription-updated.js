import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { MongoClient, ObjectID } from "mongodb";

global._filename = (_meta) => _meta.url.split("/").pop();
// necessary path resolution for running as cron job
dotenv.config({ path: path.resolve(_filename(import.meta), '../.env') });
const username = encodeURIComponent(process.env.DB_USER);
const password = encodeURIComponent(process.env.DB_PASSWORD);
const mongo_uri = `mongodb://${username}:${password}@localhost/${process.env.DB_NAME}`;
global._logger = console;
global._mongodb;
_logger.notice = (e) => console.log(e);

import subscriptionUpdated from "../src/webhooks/recharge/subscription-updated.js";
import subscription from "../recharge.subscription.json" assert { type: "json" };
console.log(subscription);

const run = async () => {
  try {
    /*
    const client = new MongoClient(mongo_uri, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();
    global._mongodb = client.db();
    console.log('this ran');
    */
    const mytopic = "SUBSCRIPTION_UPDATED";
    await subscriptionUpdated("SUBSCRIPTION_UPDATED", "shop", JSON.stringify(subscription));

  } catch(e) {
    console.error(e);
  } finally {
    //await client.close();
  };
};

const main = async () => {
  await run();
};

main().catch(console.error);







