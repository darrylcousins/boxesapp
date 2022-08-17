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

    inquirer
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
        const { charges } = await makeRechargeQuery({
          path: `charges`,
          query: [
            ["customer_id", customer_id ],
            ["status", "queued" ],
            ["sort_by", "scheduled_at-asc" ]
          ]
        });
        if (!charges || !charges.length) {
          // return a result of none
          console.warn("No charges");
          return;
        };

        const groups = reconcileGetGroups({ charges });
        let result = [];

        for (const grouped of groups) {
          // run through each of these groups
          result = await gatherData({ grouped, result });
        };
        /*
        console.log(JSON.stringify(result[0].updates, null, 2));
        console.log(JSON.stringify(result[0].includes, null, 2));
        */
        console.log(result[0].attributes.nowAvailableAsAddOns);
        console.log(result[0].messages);

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


