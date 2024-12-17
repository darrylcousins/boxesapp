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
 * Just to sort out how I'm going to manage async batches
 */

const run = async () => {

  // this one closes the connection on SIGINT
  global._mongodb = await getMongoConnection(); // if mongo connection required

  try {

    // put a time out on the interval
    const counter = new Date();

    const batch_ids = [[111, "update"], [222, "delete"], [333, "create"], [444, "cancel"]];
    let batch; // current batch being processed

    const mockProcess = async (batch_id) => {
      setTimeout(async () => {
        await _mongodb.collection("pending_batches").deleteMany({id: batch_id});
      }, 3000);
    };

    const processBatch = async (batch, batch_ids) => {
      const [batch_id, batch_type] = batch;
      
      // create entry
      const doc = {
        id: batch_id,
        session_id: `${batch_id}r4rew`, // so a message gets sent to socket at the processed webhook
        action: batch_type,
      };
      await _mongodb.collection("pending_batches").insertOne(doc);

      console.log("Processing", batch_type, batch_id);
      await mockProcess(batch_id);

      if (batch_ids.length === 0) {
        // all done
        setTimeout(async () => {
          process.emit('SIGINT'); // will close mongo connection
        }, 5000);

      } else {

        const timer = setInterval(async () => {
          const now = new Date();
          const millis = now.getTime() - counter.getTime();
          const minutes = Math.floor(millis / 60000);
          if (minutes > 10 && timer) {
            await _mongodb.collection("pending_batches").deleteMany({id: batch_id});
            clearInterval(timer);
            // should log this too as an error so I can check up on it
          }
          const entry = await _mongodb.collection("pending_batches").findOne({id: batch_id});
          if (!entry) {
            console.log("Finished", batch_id);
            clearInterval(timer);
            batch = batch_ids.shift();
            console.log(batch, batch_ids);
            await processBatch(batch, batch_ids);
          };
        }, 500);

      };
    };

    batch = batch_ids.shift();
    await processBatch(batch, batch_ids);

  } catch(e) {
    console.error(e);
  } finally {
    // process.emit('SIGINT'); // will close mongo connection
  };
};

const main = async () => {
  await run();
  //process.emit('SIGINT'); // will close mongo connection
};

main().catch(console.error);





