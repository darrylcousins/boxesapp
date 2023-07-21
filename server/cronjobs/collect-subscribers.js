/**
 * Collect and update subscribers locally
 * This is simply to ensure that we keep active subscriptions up to date
 *
 * Set as a cron job to run nightly
 * 
 * Run from ./collect-subscribers-cron.sh
 *
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { getMongo } from "../src/lib/mongo/mongo.js";
import { winstonLogger } from "../config/winston.js";
import { makeRechargeQuery } from "../src/lib/recharge/helpers.js";

dotenv.config({ path: path.resolve("..", ".env") });

const main = async () => {

  // for winstonLogger to store to mongo we need a client in the process
  // regardless whether it is actually used in the script
  const { mongo: mongodb, client: dbClient } = await getMongo();

  try {

    const collection = mongodb.collection("customers");
    const result = await makeRechargeQuery({
      path: `customers`,
      query: [
        ["limit", 250 ],
      ]
    });
    const { customers, next_cursor, previous_cursor } = result;

    if (next_cursor) {
      console.log(`Collect customers, got more than 250 ${customers.length}`);
      // XXX must code for this now while I still can
    };

    for (const el of customers) {

      const res = await makeRechargeQuery({
        path: `charges`,
        query: [
          ["customer_id", el.id ],
          ["status", "queued" ],
          ["sort_by", "scheduled_at-asc" ],
        ]
      });
      const charge_list = [];

      if (res.charges) {
        for (const c of res.charges) {
          console.log(c.id, c.scheduled_at, c.status);
          charge_list.push([c.id, c.scheduled_at]);
        };
      };

      const doc = {
        first_name: el.first_name,
        last_name: el.last_name,
        email: el.email,
        recharge_id: el.id,
        shopify_id: parseInt(el.external_customer_id.ecommerce),
        subscriptions_active_count: el.subscriptions_active_count,
        subscriptions_total_count: el.subscriptions_total_count,
        charge_list,
      };
      const result = await collection.updateOne(
        { recharge_id: parseInt(doc.recharge_id) },
        { "$set" : doc },
        { "upsert": true }
      );
    };
  } catch(err) {
    winstonLogger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  } finally {
    await dbClient.close();
    process.exit(1);
  };
};

try {
  await main();
} catch(err) {
  winstonLogger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
};
