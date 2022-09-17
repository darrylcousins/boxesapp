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

const run = async () => {
  global._mongodb = await getMongoConnection();
  try {

    const base_url = process.env["RECHARGE_URL"];
    const result = await makeRechargeQuery({
      path: `charges`,
      query: [
        ["customer_id", "84185810" ],
        ["address_id", "102438357"],
        ["purchase_item_ids", "276632555,27626962" ],
      ]
    });
    console.log(result);
    for (const charge of result.charges) {
      console.log(charge.line_items.map(el => el.purchase_item_id));
    };
    /*
    if (!charges || !charges.length) {
      // return a result of none
      console.warn("No charges");
      return;
    };
    */

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



