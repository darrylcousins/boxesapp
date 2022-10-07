import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { MongoClient, ObjectID } from "mongodb";

const _filename = (_meta) => _meta.url.split("/").pop();
global._logger = console;
_logger.notice = (e) => console.log(e);
/**
 * Simple template for node script
 */

// necessary path resolution for running as cron job
dotenv.config({ path: path.resolve(_filename(import.meta), '../.env') });

const run = async () => {
  console.log('This tried');

  const username = encodeURIComponent(process.env.DB_USER);
  const password = encodeURIComponent(process.env.DB_PASSWORD);
  const mongo_uri = `mongodb://${username}:${password}@localhost/${process.env.DB_NAME}`;
  const client = new MongoClient(mongo_uri, { useNewUrlParser: true, useUnifiedTopology: true });
  await client.connect();
  try {
    const db = client.db();
    console.log('this ran');
    const query = {
      "$or": [
        { "addOnProducts.shopify_product_id": {$type: "string"} },
        { "addOnProducts.shopify_variant_id": {$type: "string"} },
        { "includedProducts.shopify_product_id": {$type: "string"} },
        { "includedProducts.shopify_variant_id": {$type: "string"} },
      ]
    };
    const boxes = await db.collection("boxes").find(query).toArray();

    let update;
    let filter;
    for (const box of boxes) {
      let doUpdate = false;
      for (const product of box.addOnProducts) {
        if (typeof product.shopify_product_id === "string" || typeof product.shopify_variant_id === "string") {
          product.shopify_product_id = parseInt(product.shopify_product_id);
          product.shopify_variant_id = parseInt(product.shopify_variant_id);
          doUpdate = true;
        };
      };
      for (const product of box.includedProducts) {
        if (typeof product.shopify_product_id === "string" || typeof product.shopify_variant_id === "string") {
          product.shopify_product_id = parseInt(product.shopify_product_id);
          product.shopify_variant_id = parseInt(product.shopify_variant_id);
          doUpdate = true;
        };
      };
      if (doUpdate) {
        filter = {_id: box._id };
        update = {"$set": { addOnProducts: box.addOnProducts, includedProducts: box.includedProducts }};
        const result = await db.collection("boxes").updateOne(filter, update);
        console.log(result);
      };
    };
    console.log(boxes.length);

  } catch(e) {
    console.error(e);
  } finally {
    await client.close();
  };
};

const main = async () => {
  await run();
};

main().catch(console.error);






