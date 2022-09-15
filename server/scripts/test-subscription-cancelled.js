/**
 * Build a query to recharge
 *
 * Run the script using `node recharge-query.js`
 *
 * @author Darryl Cousins <darryljcousins@gmail.com>
 * @module recharge-query
 */
import { exec } from "child_process";
import colors from "colors";
import inquirer from "inquirer";
import ora from "ora";
import { writeFileSync } from "fs";
import "isomorphic-fetch";

import path from "path";
import dotenv from "dotenv";    
import { MongoClient, ObjectID } from "mongodb";
import { getMongoConnection, MongoStore } from "../src/lib/mongo/mongo.js";

global._filename = (_meta) => _meta.url.split("/").pop();
dotenv.config({ path: path.resolve(_filename(import.meta), '../.env') });
global._logger = console;
global._mongodb;
_logger.notice = (e) => console.log(e);

import { makeRechargeQuery } from "../src/lib/recharge/helpers.js";
import { reconcileGetGrouped } from "../src/lib/recharge/reconcile-charge-group.js";
import { gatherData, reconcileChargeGroup, reconcileGetGroups } from "../src/lib/recharge/reconcile-charge-group.js";

const customers = {
  "91048167": "Maria",
  "84185810": "Darryl",
};

const run = async () => {
  global._mongodb = await getMongoConnection();
  try {

    const base_url = process.env["RECHARGE_URL"];
    console.log('\nQuery Test customer charges'.magenta);
    console.log(`\n${'-'.padEnd(70, '-')}`);

    await inquirer
      .prompt([
      {
        type: 'list',
        name: 'customer',
        message: 'customer?',
        choices: Object.keys(customers),
      },
      ]).then(async res => {
        const customer_id = res.customer;
        console.log(`\nCollecting for customer ${customers[customer_id]}`.blue);
        const { subscriptions } = await makeRechargeQuery({
          path: `subscriptions`,
          query: [
            ["customer_id", customer_id ],
            ["status", "cancelled" ],
          ]
        });
        if (!subscriptions || !subscriptions.length) {
          // return a result of none
          console.warn("No charges");
          return;
        };

        //console.log(subscriptions);
        //
        for (const el of subscriptions) {
          console.log(el.id);
          console.log(el.product_title);
          console.log(el.variant_title);
          console.log(el.properties);
          console.log(el.external_product_id);
          el.purchase_item_id = el.id
        };

        const charge = {};
        charge.line_items = subscriptions;

        const grouped = reconcileGetGrouped({ charge });

        console.log(grouped);

        /*
        for (const [id, group] of Object.entries(grouped)) {
          // get the address ids and get the address
          const { address } = await makeRechargeQuery({
            path: `addresses/${group.box.address_id}`,
          });
          group.charge.shipping_address = address;
        };
        */


      });
  } catch(e) {
    console.error(e);
  } finally {
    process.emit("SIGINT");
  };
};

try {
  run();
} catch(e) {
  console.log('Bleh'.red);
};



