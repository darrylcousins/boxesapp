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
    query[`meta.recharge.customer_id`] = parseInt(customer_id);
    query[`meta.recharge.subscription_id`] = parseInt(subscription_id);

    const pipeline = [
      { "$match": query },
      { "$sort": { timestamp: -1 }},
    ];

    const result = await collection.aggregate(pipeline).toArray();

    // not to many queries are expected so just aggregate in a loop
    // should be smart enough to add this to the pipeline
    for (const item of [ ...result ]) {
      if (item.meta.recharge.shopify_order_id) {
        const res = await collection.find({"meta.order.shopify_order_id": parseInt(item.meta.recharge.shopify_order_id) }).toArray();
        for (const item of res) {
          result.push(item);
        };
      }
    };

    const final = sortObjectArrayByKey(result, "timestamp");
    console.log(final.reverse());

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
