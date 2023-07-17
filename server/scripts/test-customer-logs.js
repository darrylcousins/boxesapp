import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { MongoClient, ObjectID } from "mongodb";
import { getMongoConnection, MongoStore } from "../src/lib/mongo/mongo.js";
import { sortObjectArrayByKey } from "../src/lib/helpers.js";

global._filename = (_meta) => _meta.url.split("/").pop();
dotenv.config({ path: path.resolve(_filename(import.meta), '../.env') });
global._logger = console;
global._mongodb;
_logger.notice = (e) => console.log(e);

/**
 * Develop a pipeline to get subscription logs for customer
 */

const run = async () => {

  global._mongodb = await getMongoConnection(); // if mongo connection required

  const collection = _mongodb.collection("logs");
  const customer_id = 84185810;
  const subscription_id = 381406130;
  try {

    const query = {};

    const count = await collection.count(query);

    const pageSize = 50;

    const currentPage = 4;
    const pageCount = Math.ceil(count/pageSize);
    const skip = (currentPage - 1) * pageSize;

    const logs = await collection.find(query).sort({ timestamp: -1 }).limit(pageSize).skip(skip).toArray();
    console.log(pageCount, logs.length);



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
