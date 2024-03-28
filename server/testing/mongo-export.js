import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { MongoClient, ObjectId } from "mongodb";
import { Shopify } from "../src/lib/shopify/index.js";
import { getMongo } from "../src/lib/mongo/mongo.js";
import { winstonLogger } from "../config/winston.js";

global._filename = (_meta) => _meta.url.split("/").pop();
dotenv.config({ path: path.resolve(_filename(import.meta), '../.env') });
global._logger = console;
global._mongodb;
_logger.notice = (e) => console.log(e);

/**
 * Simple template for node script
 */

const run = async () => {

  const { mongo: mongodb, client: dbClient } = await getMongo();
  global._mongodb = mongodb;

  try {
    console.log('this ran');

    const charge_id = 1028709110;
    const result = await _mongodb.collection("logs").find({"meta.recharge.charge_id": charge_id}).sort({timestamp: -1}).limit(10).toArray();
    console.log(result);
    fs.writeFileSync(`charge-logs-${charge_id}.json`, JSON.stringify({ logs: result }, null, 2));

  } catch(e) {
    console.error(e);
  } finally {
    dbClient.close();
    process.emit('SIGINT'); // will close mongo connection
  };
};

const main = async () => {
  await run();
  process.emit('SIGINT'); // will close mongo connection
};

main().catch(console.error);





