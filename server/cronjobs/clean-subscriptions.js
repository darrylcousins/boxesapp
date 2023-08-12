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
import { makeRechargeQuery } from "../src/lib/recharge/helpers.js";
import { matchNumberedString } from "../src/lib/helpers.js";
import { reconcileGetGrouped } from "../src/lib/recharge/reconcile-charge-group.js";
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

    for (const customer of customers ) {
      let orphans = []; // collect as rc_subscription objects
      let date_mismatch = []; // collected as groups currently
      let updates_pending = [];
      let collected_rc_subscription_ids = [];
      let tempDate;
      let pending = await mongodb.collection("updates_pending").find({customer_id: customer.recharge_id}).toArray();
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
        // gut feeling here is I need to group the line_items by
        // next_charge_scheduled_at so that I can add next_scheduled_at to the
        // stub charge I create
        const line_item_groups = {};
        for (const line_item of line_items) {
          if (!Object.hasOwnProperty.call(line_item_groups, line_item.next_charge_scheduled_at)) {
            line_item_groups[line_item.next_charge_scheduled_at] = [];
          };
          line_item_groups[line_item.next_charge_scheduled_at].push(line_item);
        };

        for (const [scheduled_at, line_items] of Object.entries(line_item_groups)) {

          const grouped = await reconcileGetGrouped({
            charge: {
              line_items,
              customer,
              id: customer.recharge_id,
              scheduled_at,
            }
          });
          for (const [id, group] of Object.entries(grouped)) {
            // rc_subscription_ids, all grouped to the box
            // need to compare the count to actual extras
            // from properties figure out which extra subscriptions we need, or not.
            if (group.box) { // XXX what to do here if no box
              const properties = group.box.properties.reduce(
                (acc, curr) => Object.assign(acc, { [`${curr.name}`]: curr.value === null ? "" : curr.value }),
                {});

              const scheduled = new Date(group.charge.scheduled_at);
              const delivered = new Date(properties["Delivery Date"]);
              let diff = delivered.getTime() - scheduled.getTime();
              let dayDiff = Math. ceil(diff / (1000 * 3600 * 24));

              // trying to pick up when charge and delivery day has been put out of sync
              if (dayDiff !== 3) {
                // we can push the whole group because we have already grouped by scheduled_at
                tempDate = new Date(group.box.updated_at);
                date_mismatch.push({
                  subscription_id: group.box.id,
                  title: group.box.product_title,
                  next_charge_scheduled_at: new Date(group.charge.scheduled_at).toDateString(),
                  delivery_at: properties["Delivery Date"],
                  updated_at: `${tempDate.toDateString()} ${tempDate.toLocaleTimeString()}`,
                  cancelled_at: group.box.cancelled_at,
                });
              };

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
                  tempDate = new Date(extra.updated_at);
                  orphans.push({
                    subscription_id: extra.subsciption_id,
                    title: extra.title,
                    next_charge_scheduled_at: new Date(extra.next_charge_scheduled_at).toDateString(),
                    delivery_at: null, // data unavailable??? see rc_subscription_ids
                    updated_at: extra.updated_at ? `${tempDate.toDateString()} ${tempDate.toLocaleTimeString()}` : null,
                    cancelled_at: null, // data unavailable??? see rc_subscription_ids
                  });
                  extra_count++; // this orphan accounted for
                };
              };
            };
          };
        };

        // now collect the other orphans, i.e. not tied to a subscription box
        // provided they have a charge, the others I can certainly delete
        //
        const collected_subscription_ids = collected_rc_subscription_ids
          .map(el => el.subscription_id);
        for (const subscription of subscriptions
          .filter(el => `${el.next_charge_scheduled_at}` !== "null")
          .filter(el => {
            return collected_subscription_ids.includes(el.id) ? false : true;
          })) {
          const { product_title: title, next_charge_scheduled_at, updated_at, cancelled_at } = subscription;
          if (`${next_charge_scheduled_at}` !== null) {
            const deliveryProp = subscription.properties.find(el => el.name === "Delivery Date");
            let deliveryDate = "";
            if (deliveryProp) {
              deliveryDate = deliveryProp.value;
            };
            tempDate = new Date(updated_at);
            orphans.push({
              subscription_id: parseInt(subscription.id),
              title,
              next_charge_scheduled_at: new Date(next_charge_scheduled_at).toDateString(),
              delivery_at: deliveryDate,
              updated_at: `${tempDate.toDateString()} ${tempDate.toLocaleTimeString()}`,
              cancelled_at,
            });
          };
        };
      } catch(err) {
        winstonLogger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
        continue;
      };
      if (orphans.length || date_mismatch.length || updates_pending.length) {
        delete customer._id;
        delete customer.subscriptions_active_count;
        delete customer.subscriptions_total_count;
        result.push({
          customer,
          orphans,
          date_mismatch,
          updates_pending,
        });
      };
    };

    //console.log(JSON.stringify(result, null, 2));
    // actually confident that I can delete all the orphans
    // but for now build a report to email to self
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
