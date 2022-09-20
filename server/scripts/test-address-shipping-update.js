import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { MongoClient, ObjectID } from "mongodb";
import { Shopify } from "../src/lib/shopify/index.js";
import { getMongoConnection, MongoStore } from "../src/lib/mongo/mongo.js";

global._filename = (_meta) => _meta.url.split("/").pop();
dotenv.config({ path: path.resolve(_filename(import.meta), '../.env') });
global._logger = console;
global._mongodb;
_logger.notice = (e) => console.log(e);

import { makeRechargeQuery } from "../src/lib/recharge/helpers.js";

/**
 * Simple template for node script
 */

const run = async () => {

  //global._mongodb = await getMongoConnection(); // if mongo connection required
  //await Shopify.initialize(); // if shopify query required
  const address_id = 104020407;
  const body = {
    shipping_lines_override: {
      code: "Box Shipping",
      price: "7.00",
      title: "Box Shipping"
    }
  };
  console.log(body);
  const result = await makeRechargeQuery({
    method: "POST",
    path: `addresses/${address_id}`,
    body: JSON.stringify(body),
  });
  console.log(result);

  // fails not permitted, can only be done manually

  try {
    console.log('this ran');

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





