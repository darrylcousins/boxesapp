import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { MongoClient, ObjectId } from "mongodb";
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
    const response = {};
    const now = new Date();
    now.setDate(now.getDate() + 3); // sort the filter thing
    // the current flag is used for adding and editing orders
    // otherwise for admin boxes we get back to a week ago
    const box_product_id = 6166841852054;
    const pipeline = [
      { "$match": {
        active: true,
        shopify_title: { "$ne": null },
        "$or": [
          { includedProducts: { "$elemMatch": { shopify_product_id: box_product_id } } },
          { addOnProducts: { "$elemMatch": { shopify_product_id: box_product_id } } }
        ],
      }},
      { "$project": {
        shopify_title: "$shopify_title",
        delivered: "$delivered",
        shopify_handle: "$shopify_handle",
        shopify_product_id: "$shopify_product_id",
        active: "$active",
        includedProduct: { "$in": [box_product_id, { "$map": { input: "$includedProducts", in: "$$this.shopify_product_id" }}]},
        addOnProduct: { "$in": [box_product_id, { "$map": { input: "$addOnProducts", in: "$$this.shopify_product_id" }}]},
        includedProducts: "$includedProducts",
        addOnProducts: "$addOnProducts",
        iso: { "$dateFromString": {dateString: "$delivered", timezone: "Pacific/Auckland"}},
      }},
      { "$match": { iso: { "$gte": now } } },
      { "$sort" : { iso: 1 } },
      {
        "$group": {
          _id: "$shopify_handle",
          boxes: { $push: "$$ROOT" }
        },
      },
    ];
    let result = await _mongodb.collection("boxes").aggregate(pipeline).toArray();
    for (const box of result) {
      response[box._id] = box.boxes;
    };
    console.log(response);

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





