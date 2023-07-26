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
import { matchNumberedString } from "../src/lib/helpers.js";
import { reconcileGetGrouped } from "../src/lib/recharge/reconcile-charge-group.js";
import cleanSubscriptionsMail from "../src/mail/clean-subscriptions.js";

dotenv.config({ path: path.resolve("..", ".env") });

global._mongodb;
global._logger;

/**
 * Simple template for node script
 */

const main = async () => {

  const { mongo: mongodb, client: dbClient } = await getMongo();
  global._mongodb = mongodb;
  global._logger = winstonLogger;

  try {

    // collect customers
    const customers = await mongodb.collection("customers").find({}).toArray();
    const customer_orphans = [];

    for (const customer of customers ) {
      let orphans = []; // collect as rc_subscription objects
      let collected_rc_subscription_ids = [];
      try {
        const { subscriptions } = await makeRechargeQuery({
          path: `subscriptions`,
          query: [
            ["limit", 250 ],
            ["customer_id", `${customer.recharge_id}` ],
          ],
          title: "Clean subscriptions",
        });
        const line_items = subscriptions
          .filter(el => `${el.next_charge_scheduled_at}` !== "null")
          .map(el => {
            return {
              ...el,
              purchase_item_id: el.id,
              title: el.product_title,
              unit_price: el.price.toString(),
            };
        });
        // customer id for finding lost items
        const grouped = await reconcileGetGrouped({ charge: { line_items, customer, id: customer.recharge_id } });
        for (const [id, group] of Object.entries(grouped)) {
          // rc_subscription_ids, all grouped to the box
          // need to compare the count to actual extras
          // from properties figure out which extra subscriptions we need, or not.
          if (group.box) { // XXX what to do here
            const properties = group.box.properties.reduce(
              (acc, curr) => Object.assign(acc, { [`${curr.name}`]: curr.value === null ? "" : curr.value }),
              {});

            const included = properties["Including"]
              .split(",").map(el => el.trim())
              .filter(el => el !== "")
              .map(el => matchNumberedString(el))
              .filter(el => el.quantity > 1)
              .map(el => ({ title: el.title, quantity: el.quantity - 1 }));
            // keeping all quantities
            const swapped = properties["Swapped Items"]
              .split(",").map(el => el.trim())
              .filter(el => el !== "")
              .filter(el => el !== "None")
              .map(el => matchNumberedString(el))
              .map(el => ({ title: el.title, quantity: el.quantity - 1 }))
              .filter(el => el.quantity > 0);
            // XXX Saw a single case where an included subscription did not appear here
            const addons = properties["Add on Items"]
              .split(",").map(el => el.trim())
              .filter(el => el !== "")
              .filter(el => el !== "None")
              .map(el => matchNumberedString(el));
            const extras = [ ...included, ...swapped, ...addons, { title: group.box.product_title, quantity: 1 } ];
            let extra_count = extras.length;
            collected_rc_subscription_ids = [ ...collected_rc_subscription_ids, ...group.rc_subscription_ids ];
            if (group.rc_subscription_ids.length !== extras.length) {
              const extra_titles = extras.map(el => el.title).sort();
              for (const extra of group.rc_subscription_ids.filter(el => {
                return extra_titles.includes(el.title) ? false : true;
              })) {
                orphans.push({
                  ...extra, box: { title: group.box.product_title, id: group.box.id }
                }); // grab the orphan that is attached to a subscription
                extra_count++; // this orphan accounted for
              };
            };
          };
        };
        // now collect the other orphans, i.e. not tied to a subscription box
        // provided they have a charge, the others I can certainly delete
        const collected_subscription_ids = collected_rc_subscription_ids
          .map(el => el.subscription_id);
        for (const subscription of subscriptions
          .filter(el => `${el.next_charge_scheduled_at}` !== "null")
          .filter(el => {
            return collected_subscription_ids.includes(el.id) ? false : true;
          })) {
          const { product_title: title, next_charge_scheduled_at, updated_at, cancelled_at } = subscription;
          if (`${next_charge_scheduled_at}` !== null) {
            orphans.push({
              shopify_product_id: parseInt(subscription.external_product_id.ecommerce),
              subscription_id: parseInt(subscription.id),
              quantity: parseInt(subscription.quantity),
              price: subscription.price * 100,
              title,
              next_charge_scheduled_at,
              updated_at,
              cancelled_at,
            });
          };
        };
      } catch(err) {
        winstonLogger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
        continue;
      };
      if (orphans.length) {
        delete customer._id;
        delete customer.subscriptions_active_count;
        delete customer.subscriptions_total_count;
        customer_orphans.push({
          customer,
          orphans
        });
      };
    };

    //console.log(JSON.stringify(customer_orphans, null, 2));
    // actually confident that I can delete all the orphans
    // but for now build a report to email to self
    await cleanSubscriptionsMail({ orphans: customer_orphans });

  } catch(err) {
    winstonLogger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  } finally {
    await dbClient.close();
    process.exit(1);
  };
};

try {
  await main();
  process.exit(1);
} catch(err) {
  winstonLogger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
};
