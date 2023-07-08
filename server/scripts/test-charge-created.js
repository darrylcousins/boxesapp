import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { getMongoConnection } from "../src/lib/mongo/mongo.js";

global._filename = (_meta) => _meta.url.split("/").pop();
// necessary path resolution for running as cron job
dotenv.config({ path: path.resolve(_filename(import.meta), '../.env') });
global._logger = console;
global._mongodb;
_logger.notice = (e, { meta }) => console.log(e, JSON.stringify(meta, null, 2));
process.env.NODE_ENV = "test";

import chargeCreated from "../src/webhooks/recharge/charge-created.js";
//import charge from "../json/recharge.charge.created.json" assert { type: "json" };
import charge from "../json/recharge.charge.test.json" assert { type: "json" };
//import charge from "../json/recharge.charge.test2.json" assert { type: "json" };

const run = async () => {
  global._mongodb = await getMongoConnection();
  try {
    console.log('this ran');
    const mytopic = "CHARGE_CREATED";
    await chargeCreated("CHARGE_CREATED", "recharge", JSON.stringify({ charge }));

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





