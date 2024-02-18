import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import mongo from "mongodb";
import { getMongoConnection, MongoStore } from "../src/lib/mongo/mongo.js";
import { Shopify } from "../src/lib/shopify/index.js";
import { getLastOrder } from "../src/lib/recharge/helpers.js";

global._filename = (_meta) => _meta.url.split("/").pop();
dotenv.config({ path: path.resolve(_filename(import.meta), '../.env') });
global._logger = console;
global._mongodb;
_logger.notice = (e) => console.log(e);

/**
 * Simple template for node script
 */

const run = async () => {

  global._mongodb = await getMongoConnection();
  //await Shopify.initialize();

  try {
    console.log('this ran');

    const cursor = await _mongodb.collection("orders").aggregate([
      { $group: {
          _id: "$delivered",
          count: { $sum: 1 }
      }},
      { "$project": {
        delivered: "$_id",
        count: "$count",
        iso: { "$dateFromString": {dateString: "$_id", timezone: "Pacific/Auckland"}},
      }},
      { "$sort" : { iso: 1 } },
    ]).toArray();
    console.log(cursor);
    const response = {};
    // sort cursor by dates using date objects
    for (const { _id, count } of cursor) {
      response[_id] = {"orders": count};
    };
    console.log(response);

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





