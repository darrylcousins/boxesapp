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

/**
 * Simple template for node script
 */

const run = async () => {

  //global._mongodb = await getMongoConnection(); // if mongo connection required
  //await Shopify.initialize(); // if shopify query required

  const uri = 'mongodb://localhost';
  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  await client.connect();
  const DB = client.db("streamside");
  const collection = DB.collection('orders');

  try {
    console.log('this ran');
    const orders = await collection.find({ delivered: "Thu Sep 29 2022" }).toArray();
    const ids = orders.map(el => el.shopify_order_id);
    console.log(ids);
    console.log(ids.length);
    await client.close();

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
