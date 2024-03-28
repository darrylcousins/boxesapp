import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { MongoClient, ObjectID } from "mongodb";
import { Shopify } from "../src/lib/shopify/index.js";
import { getMongo } from "../src/lib/mongo/mongo.js";
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

  //global._mongodb = await getMongoConnection(); // if mongo connection required
  // for winstonLogger to store to mongo we need a client in the process
  // regardless whether it is actually used in the script
  const { mongo: mongodb, client: dbClient } = await getMongo();
  global._mongodb = mongodb;


  try {
    console.log('this ran');

    const id = 1111111111111;
    const doc = {
      first_name: "jeff",
      last_name: "someone",
      email: "jeff@someone.com",
      recharge_id: parseInt(id),
      shopify_id: parseInt(2222222222222),
    };
    // should be able to figure an aggregation  pipeline to do this
    await _mongodb.collection("customers").updateOne(
      { recharge_id: parseInt(id),
      },
      { 
        "$set" : doc,
        "$addToSet" : { charge_list: [ 5555555555, "2024-02-03" ] },
      },
      { "upsert": true }
    );

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





