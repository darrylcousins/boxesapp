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

import { makeRechargeQuery } from "../src/lib/recharge/helpers.js";
import subscription from "../recharge.subscription.json" assert { type: "json" };

const getCharge = async (subscription) => {
  const result = await makeRechargeQuery({
    path: `charges`,
    query: [
      ["customer_id", subscription.customer_id ],
      ["address_id", subscription.address_id ],
      //["scheduled_at", subscription.next_charge_scheduled_at ],
      ["scheduled_at", "2022-10-02" ],
      ["status", "queued" ]
    ]
  });
  console.log(result);
  let charge = null;
  if (Object.hasOwnProperty.call(result, "charges")) {
    charge = (result.charges.length) ? result.charges[0] : null;
  }
  return charge;
};

const sleepUntil = async (subscription, timeoutMs) => {
  return new Promise((resolve, reject) => {
    let timeWas = new Date();
    let wait = setInterval(async function() {
      let charge = await getCharge(subscription);
      if (charge) {
        try {
          clearInterval(wait);
        } catch(e) {
          console.log("Failed to clear interval on resolve");
        };
        resolve(charge.id);
      } else if (new Date() - timeWas > timeoutMs) { // Timeout
        try {
          clearInterval(wait);
        } catch(e) {
          console.log("Failed to clear interval on reject");
        };
        reject("No charge");
      }
    }, 5000);
  });
}

const run = async () => {
  global._mongodb = await getMongoConnection();
  try {

    const result = await sleepUntil(subscription, 10000);
    console.log(result);

  } catch(e) {
    console.error(e);
  } finally {
    process.emit("SIGINT");
  };
};

const main = async () => {
  await run();
};

main().catch(console.error);







