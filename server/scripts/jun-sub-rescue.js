import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { MongoClient, ObjectID } from "mongodb";
import { Shopify } from "../src/lib/shopify/index.js";
import { makeShopQuery } from "../src/lib/shopify/helpers.js";
import { getMongoConnection, MongoStore } from "../src/lib/mongo/mongo.js";
import ordersCreate from "../src/webhooks/shopify/orders-create.js";

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

  const username = encodeURIComponent(process.env.DB_USER);
  const password = encodeURIComponent(process.env.DB_PASSWORD);

  const uri = `mongodb://${username}:${password}@localhost/${process.env.DB_NAME}`;
  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  await client.connect();
  const DB = client.db("streamsideorganics");

  // target date
  const delivered = "Thu Jun 22 2023";

  try {
    console.log('this ran');
    const orders = await DB.collection("orders").find(
      { delivered, "source.type": "subscription_contract" }
    ).toArray();
    const boxes = await DB.collection("boxes").find({ delivered }).toArray();

    let contents = {};
    let title;
    let products;
    let addons;

    for (const box of boxes) {
      //contents[box.shopify_title] = box.includedProducts.map(el => el.shopify_title);
      title = box.shopify_title;
      products = box.includedProducts.map(el => el.shopify_title);
      addons = box.addOnProducts.map(el => el.shopify_title);
      contents[title] = {};
      contents[title].products = products;
      contents[title].addons = addons;
    };
    //console.log(contents);

    console.log(orders.length);

    let swaps;
    let removed;
    let included; // included items in the order, as a result of algorithm
    let including; // items in the box itself
    let names = [];

    for (const order of orders) {
      if (order.product_title === "Custom Box") continue;
      swaps = [];
      removed = [];
      //console.log(order.name, order.delivered);
      including = contents[order.product_title].products.filter(el => !order.removed.includes(el));
      if (order.including.toString() !== including.toString()) {
        //console.log(order.including);
        if (order.removed[0] !== "None") {

          for (const prod of order.removed) {
            if (contents[order.product_title].products.includes(prod)) {
              removed.push(prod);
            }
          };
          if (removed.length > 0) {
            for (const prod of order.swaps) {
              if (contents[order.product_title].addons.includes(prod)) {
                swaps.push(prod);
              }
            };
          };
        };
        included = contents[order.product_title].products.filter(el => !removed.includes(el));
        if (swaps.length === 0) swaps = ["None"];
        if (removed.length === 0) removed = ["None"];
        console.log("*** Start new lists");
        console.log(order.name);
        console.log(order.product_title);
        //console.log(order.removed);
        console.log(swaps);
        console.log(removed);
        //console.log(included);
        console.log("*** End new lists");
        names.push(order.name);
        /* Perform update */
        /*
        const result = await DB.collection("orders").updateOne(
          { _id: order._id },
          { $set: { swaps, including: included, removed } }
        );
        console.log(result);
        */
      };
    };
    for (let name of names) {
      console.log(name);
    };
    console.log(`${names.length} orders required correction`);

  } catch(e) {
    console.error(e);
  } finally {
    process.emit('SIGINT'); // will close mongo connection
    await client.close();
  };
};

const main = async () => {
  await run();
};

main().catch(console.error);

