import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { MongoClient, ObjectID } from "mongodb";

const _filename = (_meta) => _meta.url.split("/").pop();
/**
 * Simple template for node script
 */

// necessary path resolution for running as cron job
dotenv.config({ path: path.resolve(_filename(import.meta), '../.env') });

const run = async () => {
  console.log('This tried');

  const re = /^[a-zA-Z0-9][a-zA-Z0-9\-]*.myshopify.com/;
  console.log(re.test("my-shop.myshopify.com"));

  /* If mongo connection required
  const username = encodeURIComponent(process.env.DB_USER);
  const password = encodeURIComponent(process.env.DB_PASSWORD);
  const mongo_uri = `mongodb://${username}:${password}@localhost/${process.env.DB_NAME}`;
  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  await client.connect();
  try {
    const db = client.db();
    console.log('this ran');

  } catch(e) {
    console.error(e);
  } finally {
    await client.close();
  };
  */
};

const main = async () => {
  await run();
};

main().catch(console.error);




