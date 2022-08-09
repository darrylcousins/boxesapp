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
    const query = { "includedProducts.shopify_tag": { "$eq" : null } };
    const update = {
      $set: { "includedProducts.$[elem].shopify_tag" : "Veggies },
    };
    const filters = {
      "arrayFilters": [
        { "elem.shopify_tag": { "$eq" : null } },
      ]
    };
    //const result = await db.collection("boxes").find(query).toArray();
    const result = await db.collection("boxes").updateMany(query, update, filters);
    console.log(JSON.stringify(result, null, 2));

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





