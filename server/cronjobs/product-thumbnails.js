/**
 * Collect product thumbnails for all products
 *
 * Save to assets
 *
 * Run from ./product-thumbnails-cron.sh
 *
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { winstonLogger } from "../config/winston.js";
import { makeShopQuery } from "../src/lib/shopify/helpers.js";
import { Shopify } from "../src/lib/shopify/index.js";
import { getMongo } from "../src/lib/mongo/mongo.js";
import { makeImageJob } from "../src/bull/job.js";

dotenv.config({ path: path.resolve("..", ".env") });

global._mongodb;
global._logger;

const main = async () => {

  const { mongo: mongodb, client: dbClient } = await getMongo();
  global._mongodb = mongodb;
  global._logger = winstonLogger;

  await Shopify.initialize(); // if shopify query required

  try {
    const collect = await mongodb.collection("boxes").find({}).project({
      _id: 0,
      shopify_product_id: 1,
      "includedProducts.shopify_product_id": 1,
      "addOnProducts.shopify_product_id": 1
    }).toArray();
    const product_ids = [];
    for (const item of collect) {
      product_ids.push(item.shopify_product_id);
      for (const el of item.addOnProducts) {
        product_ids.push(el.shopify_product_id);
      };
      for (const el of item.includedProducts) {
        product_ids.push(el.shopify_product_id);
      };
    };
    const shopify_product_ids = Array.from(new Set(product_ids.filter(el => typeof el !== "undefined")));

    const image_urls = [];
    const trunc = [ shopify_product_ids[0] ];
    for (const product_id of trunc) {
      const path = `products/${product_id}/images.json`;
      const result = await makeShopQuery({path, fields: ["product_id", "src", "id"] })
      if (result.images && result.images.length > 0) {
        const image = result.images[0];
        image_urls.push({
          id: image.product_id,
          url: image.src,
        });
      };
    };

    for (const { id, url } of image_urls) {
      // fetch the image data, convert to 40px and save as id.jpg
      const result = await makeImageJob({ id, url });
    };

  } catch(err) {
    winstonLogger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  } finally {
    await dbClient.close();
  };
};

try {
  await main();
  process.exit(1);
} catch(err) {
  winstonLogger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
};
