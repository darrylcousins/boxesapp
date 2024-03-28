import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { MongoClient, ObjectId } from "mongodb";
import { Shopify } from "../src/lib/shopify/index.js";
import { getMongo, getMongoConnection } from "../src/lib/mongo/mongo.js";
import { winstonLogger } from "../config/winston.js";

const getLogger = () => {
  if (typeof _logger === "undefined") {
    return winstonLogger;
  } else {
    return _logger;
  };
};

global._filename = (_meta) => _meta.url.split("/").pop();
dotenv.config({ path: path.resolve(_filename(import.meta), '../.env') });
global._logger = console;
global._mongodb;
_logger.notice = (e) => console.log(e);

/**
 * Simple template for node script
 */

const run = async () => {

  // this one closes the connection on SIGINT
  global._mongodb = await getMongoConnection(); // if mongo connection required

  // this one you need to close the connection yourself client.close()
  //const { mongo: mongodb, client: dbClient } = await getMongo();
  //global._mongodb = mongodb;

  //await Shopify.initialize(); // if shopify query required

  // can log messages if required
  //await winstonLogger.notice(`Test logger`);

  try {
    console.log('this ran');

  } catch(e) {
    console.error(e);
  } finally {
    //dbClient.close(); only needed if using getMongo()
    process.emit('SIGINT'); // will close mongo connection
  };
};

const main = async () => {
  await run();
  process.emit('SIGINT'); // will close mongo connection
};

main().catch(console.error);




