import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { MongoClient, ObjectId } from "mongodb";
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
    const getQuery = (result) => {
      let query = [
        ["limit", 250 ],
        ["scheduled_at", "2024-03-02" ],
      ];
      if (result.next_cursor) {
        console.log(result.next_cursor);
        query.push(
          ["page_info", result.next_cursor ],
        );
      };
      return query;
    };

    let nextCursor = true;
    let charges = [];
    let result = { next_cursor: false };

    let count = 1;
    while (nextCursor === true && count < 3) {
      result = await makeRechargeQuery({
        path: `charges`,
        query: getQuery(result),
      });
      console.log(result.charges.length);
      charges = [ ...charges, ...result.charges ];
      if (!result.next_cursor) nextCursor = false;
      count++;
    };
    console.log(charges.length);

    return;
    const insert = customers.map(el => {
      return {
        first_name: el.first_name,
        last_name: el.last_name,
        email: el.email,
        recharge_id: el.id,
        shopify_id: parseInt(el.external_customer_id.ecommerce),
        subscriptions_active_count: el.subscriptions_active_count,
        subscriptions_total_count: el.subscriptions_total_count,
      };
    });

    for (const doc of insert) {
      const result = await _mongodb.collection("customers").updateOne(
        { recharge_id: parseInt(doc.recharge_id) },
        { "$set" : doc },
        { "upsert": true }
      );
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





