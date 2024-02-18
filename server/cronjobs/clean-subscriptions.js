/**
 * Collect and update subscribers locally
 * This is simply to ensure that we keep active subscriptions up to date
 * Added Aug 2023: check that dates align correctly
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
import { verifyCustomerSubscriptions } from "../src/lib/recharge/verify-customer-subscriptions.js";
import cleanSubscriptionsMail from "../src/mail/clean-subscriptions.js";

dotenv.config({ path: path.resolve("..", ".env") });

global._mongodb;
global._logger;

/**
 * Nightly cron
 */
const main = async () => {

  const { mongo: mongodb, client: dbClient } = await getMongo();
  global._mongodb = mongodb;
  global._logger = winstonLogger;

  try {

    // collect customers
    const customers = await mongodb.collection("customers").find({}).toArray();

    const result = [];
    let box_price_table = []; // holds shop prices as list of { variant_id, price } so as to avoid too many calls

    for (const customer of customers ) {

      let tempDate;

      let updates_pending = [];
      let pending = await _mongodb.collection("updates_pending").find({customer_id: customer.recharge_id}).toArray();

      for (const entry of pending) {
        tempDate = new Date(entry.timestamp);
        updates_pending.push({
          subscription_id: parseInt(entry.subscription_id),
          title: entry.title,
          next_charge_scheduled_at: new Date(entry.scheduled_at).toDateString(),
          delivery_at: entry["Delivery Date"],
          updated_at: `${tempDate.toDateString()} ${tempDate.toLocaleTimeString()}`,
          cancelled_at: null,
        });
      };

      const { orphans, date_mismatch, price_mismatch, price_table } = await verifyCustomerSubscriptions({ customer, box_price_table });
      box_price_table = [ ...price_table ];

      // actually confident that I can delete all the orphans but we shan't at
      // the moment, they will be emailed to admin and self and stored on a table
      if (orphans.length || date_mismatch.length || updates_pending.length || price_mismatch.length) {
        // store data on faulty_subscription table
        delete customer._id;
        delete customer.subscriptions_active_count;
        delete customer.subscriptions_total_count;

        // Let's call the table faulty_subscriptions, 
        await mongodb.collection("faulty_subscriptions").updateOne(
          { customer_id: customer.recharge_id },
          { "$set" : {
            orphans,
            date_mismatch,
            price_mismatch,
            timestamp: new Date(),
          }},
          { "upsert": true }
        );

        console.log(date_mismatch);

        result.push({
          customer,
          orphans,
          date_mismatch,
          price_mismatch,
          updates_pending,
        });
      };
    };

    //console.log(JSON.stringify(result, null, 2));

    // build a report to email to self
    await cleanSubscriptionsMail({
      result,
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
