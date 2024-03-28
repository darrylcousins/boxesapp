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

import { getSubscription, updateSubscription, makeRechargeQuery } from "../src/lib/recharge/helpers.js";
import { gatherData, reconcileChargeGroup, reconcileGetGroups } from "../src/lib/recharge/reconcile-charge-group.js";

const run = async () => {
  try {

    const customer_id = 84185810;
    const { addresses } = await makeRechargeQuery({
      path: `addresses`,
      query: [
        ["customer_id", customer_id ],
      ]
    });
    const filtered = addresses.map(el => el.id).filter(el => el !== 101345543);
    console.log(filtered);
    console.log(addresses.length);
    console.log(filtered.length);

    const first = [ filtered[0] ];

    for (const id of filtered) {
      const result = await makeRechargeQuery({
        method: "DELETE",
        path: `addresses/${id}`
      });
      console.log(result);
    };

  } catch(e) {
    console.error(e);
  };
};

try {
  run();
} catch(e) {
  console.log('Bleh'.red);
};



