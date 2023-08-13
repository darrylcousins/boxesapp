import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { MongoClient, ObjectID } from "mongodb";
import { Shopify } from "../src/lib/shopify/index.js";
import { makeShopQuery } from "../src/lib/shopify/helpers.js";
import { getMongo } from "../src/lib/mongo/mongo.js";
import { makeImageJob } from "../src/bull/job.js";

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

  await Shopify.initialize(); // if shopify query required
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

  const trunc_ids = [ ...shopify_product_ids ];

  const image_urls = [];
  for (const product_id of trunc_ids) {
    const img = `${process.env.SERVER_ROOT}/assets/product-images/${product_id}.jpg`;
    if (!fs.existsSync(img)) {
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
  };

  console.log(image_urls);
  for (const { id, url } of image_urls) {
    // fetch the image data, convert to 40px and save as id.jpg
    //const result = await makeImageJob({ id, url });
    const img = `${process.env.SERVER_ROOT}/assets/product-images/${id}.jpg`;
    console.log(id, url);

    const image_data = await fetch(url);
    const blob = await image_data.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    sharp(buffer)
      .resize(40, 40, { fit: "cover" })
      .toFile(img);

  };
  try {
    console.log('this ran');

  } catch(e) {
    console.error(e);
  } finally {
    dbClient.close();
  };
};

const main = async () => {
  await run();
  //process.exit(1);
};

main().catch(console.error);
