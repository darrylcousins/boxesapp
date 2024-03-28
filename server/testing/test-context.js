import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { Shopify } from "../src/lib/shopify/index.js";
import { MongoStore } from "../src/lib/mongo.js";
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
  const context = {
    ACCESS_TOKEN: "333333333333333333333",
    API_KEY: process.env.SHOPIFY_API_KEY,
    API_SECRET_KEY: process.env.SHOPIFY_API_SECRET,
    SCOPES: process.env.SHOPIFY_SCOPES.split(","),
    HOST_NAME: process.env.HOST.replace(/https:\/\//, ""),
    API_VERSION: process.env.SHOPIFY_API_VERSION,
    API_URL: `https://${process.env.SHOP}`,
  };

  const username = encodeURIComponent(process.env.DB_USER);
  const password = encodeURIComponent(process.env.DB_PASSWORD);
  const mongo_uri = `mongodb://${username}:${password}@localhost/${process.env.DB_NAME}`;
  const client = new MongoClient(mongo_uri, { useNewUrlParser: true, useUnifiedTopology: true });
  await client.connect();
  try {
    const _mongodb = client.db();
    Shopify.initialize(context, _mongodb);
    await Shopify.Registry.addHandler({topic: "TEST", path: "test", handler: () => {}});

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





