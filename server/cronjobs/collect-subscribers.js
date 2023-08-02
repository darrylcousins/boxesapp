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
import collectSubscribersMail from "../src/mail/collect-subscribers.js";

dotenv.config({ path: path.resolve("..", ".env") });

global._mongodb;
global._logger;

const main = async () => {

  // for winstonLogger to store to mongo we need a client in the process
  // regardless whether it is actually used in the script
  const { mongo: mongodb, client: dbClient } = await getMongo();
  global._mongodb = mongodb;
  global._logger = winstonLogger;

  try {

    const collection = mongodb.collection("customers");
    const existingCount = await collection.countDocuments({}, { hint: "_id_" });
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

      const charge_list = [];

      if (el.subscriptions_active_count > 0) {
        try {
          const res = await makeRechargeQuery({
            path: `charges`,
            query: [
              ["customer_id", el.id ],
              ["status", "queued" ],
              ["sort_by", "scheduled_at-asc" ],
            ]
          });

          if (res.charges) {
            for (const c of res.charges) {
              charge_list.push([c.id, c.scheduled_at]);
            };
          };
        } catch(err) {
          winstonLogger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
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
    const updatedCount = await collection.countDocuments({}, { hint: "_id_" });
    const activeCount = await collection.countDocuments({
      subscriptions_active_count : { "$ne": 0 }
    }, { hint: "_id_" });
    const inactiveCount = await collection.countDocuments({
      subscriptions_active_count : { "$eq": 0 }
    }, { hint: "_id_" });
    const activeNoChargeCount = await collection.countDocuments({
      subscriptions_active_count : { "$ne": 0 },
      charge_list: { "$eq": [] }
    }, { hint: "_id_" });
    let activeNoCharges = [];
    if (activeNoChargeCount > 0) {
      const withoutCharges = await collection.find({
        subscriptions_active_count : { "$ne": 0 },
        charge_list: { "$eq": [] }
      }).sort({ last_name: 1 }).toArray();
      activeNoCharges = withoutCharges.map(el => {
        return {
          name: `${el.first_name} ${el.last_name} &lt;${el.email}&gt;`,
          recharge_id: el.recharge_id,
        };
      });
    };
    await collectSubscribersMail({
      existingCount,
      updatedCount,
      activeCount,
      inactiveCount,
      activeNoChargeCount,
      activeNoCharges,
    });
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
