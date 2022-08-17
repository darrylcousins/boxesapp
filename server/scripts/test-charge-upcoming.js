import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { MongoClient, ObjectID } from "mongodb";
import "isomorphic-fetch";

global._filename = (_meta) => _meta.url.split("/").pop();
dotenv.config({ path: path.resolve(_filename(import.meta), '../.env') });
const username = encodeURIComponent(process.env.DB_USER);
const password = encodeURIComponent(process.env.DB_PASSWORD);
const mongo_uri = `mongodb://${username}:${password}@localhost/${process.env.DB_NAME}`;
global._logger = console;
global._mongodb;
_logger.notice = (e) => console.log(e);

import chargeUpcoming from "../src/webhooks/recharge/charge-upcoming.js";
import charge from "../recharge.charge.json" assert { type: "json" };

const run = async () => {
  try {
    console.log('this ran');
    const mytopic = "CHARGE_UPCOMING";
    await chargeUpcoming("CHARGE_UPCOMING", "shop", JSON.stringify(charge));

  } catch(e) {
    console.error(e);
  } finally {
    await client.close();
  };
};

const main = async () => {
  await run();
};

main().catch(console.error);




