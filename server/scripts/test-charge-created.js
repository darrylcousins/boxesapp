import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { getMongoConnection } from "../src/lib/mongo/mongo.js";
import { winstonLogger } from "../config/winston.js";

const getLogger = () => {
  if (typeof _logger === "undefined") {
    return winstonLogger;
  } else {
    return _logger;
  };
};

global._filename = (_meta) => _meta.url.split("/").pop();
// necessary path resolution for running as cron job
dotenv.config({ path: path.resolve(_filename(import.meta), '../.env') });
global._logger = console;
_logger.notice = (e, { meta }) => console.log(e, JSON.stringify(meta, null, 2));
//process.env.NODE_ENV = "development";
global._mongodb;

import { getBoxesForCharge, getMetaForCharge, writeFileForCharge, buildMetaForBox, itemStringToList  } from "../src/webhooks/recharge/helpers.js";
import chargeCreated from "../src/webhooks/recharge/charge-created.js";
//import charge from "../json/recharge.charge.created.json" assert { type: "json" };
import json from "../recharge.charge.json" assert { type: "json" };
//import charge from "../json/recharge.charge.test2.json" assert { type: "json" };

const run = async () => {
  global._mongodb = await getMongoConnection();
  try {
    console.log(process.env.NODE_ENV);
    console.log('this ran');
    const mytopic = "CHARGE_CREATED";
    //await chargeCreated("CHARGE_CREATED", "recharge", JSON.stringify(charge));

    const charge = json.charge;
    const { box_subscriptions_possible, box_subscription_ids } = getBoxesForCharge(charge);
    console.log(box_subscriptions_possible);
    console.log(box_subscription_ids);

  } catch(e) {
    console.error(e);
  } finally {
    //process.emit('SIGINT'); // should close mongo connection
  };
};

const main = async () => {
  await run();
};

main().catch(console.error);





