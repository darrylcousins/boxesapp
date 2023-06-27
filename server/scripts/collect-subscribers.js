import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { MongoClient, ObjectID } from "mongodb";
import { Shopify } from "../src/lib/shopify/index.js";
import { getMongoConnection, MongoStore } from "../src/lib/mongo/mongo.js";
import { makeRechargeQuery } from "../src/lib/recharge/helpers.js";

global._filename = (_meta) => _meta.url.split("/").pop();
dotenv.config({ path: path.resolve(_filename(import.meta), '../.env') });
global._logger = console;
global._mongodb;
_logger.notice = (e) => console.log(e);

/**
 * Script to collect subscribers from recharge and store to mongodb.
 * The reason is because the customer api on recharge does not provide sorting
 * (except id and created/updated date) nor searching except by email and ecommerce id
 * This is  to get started, new customers will be added as they arrive
 * For Streamside check for cursor, may be more than 250
 */

const run = async () => {

  global._mongodb = await getMongoConnection(); // if mongo connection required

  try {
    console.log('this ran');
    const collection = _mongodb.collection("customers");
    const result = await makeRechargeQuery({
      path: `customers`,
      query: [
        ["limit", 250 ],
      ]
    });
    const { customers, next_cursor, previous_cursor } = result;

    console.log(customers.length);
    if (next_cursor) {
      console.log("Got more than 250");
    };

    const insert = customers.map(el => {
      return {
        first_name: el.first_name,
        last_name: el.last_name,
        email: el.email,
        recharge_id: el.id,
        shopify_id: parseInt(el.external_customer_id.ecommerce),
      };
    });

    for (const c of insert) {
      const customer = await collection.findOne({ recharge_id: c.recharge_id });
      if (!customer) {
        const res = await collection.insertOne(c);
      };
    };

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





