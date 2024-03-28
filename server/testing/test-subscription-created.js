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

import subscriptionCreated from "../src/webhooks/recharge/subscription-created.js";
// box
import subscription from "../json/recharge.subscription.box.json" assert { type: "json" };
// carrots
//import subscription from "../json/recharge.subscription.carrot.json" assert { type: "json" };

const run = async () => {
  global._mongodb = await getMongoConnection();
  try {

    const mytopic = "SUBSCRIPTION_CREATED";
    await subscriptionCreated("SUBSCRIPTION_CREATED", "shop", JSON.stringify({ subscription }));

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






