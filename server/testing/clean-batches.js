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
import { MongoClient, ObjectId } from "mongodb";
import { getMongoConnection, MongoStore } from "../src/lib/mongo/mongo.js";

global._filename = (_meta) => _meta.url.split("/").pop();
dotenv.config({ path: path.resolve(_filename(import.meta), '../.env') });
global._logger = console;
global._mongodb;
_logger.notice = (e) => console.log(e);

import { makeRechargeQuery } from "../src/lib/recharge/helpers.js";

const run = async () => {
  try {

    const { async_batches } = await makeRechargeQuery({
      path: `async_batches`,
    });

    for (const batch of async_batches) console.log(batch);

    // NOTE we can only delete batches "not_started"
    for (const batch of async_batches) {
      if (batch.status === "not_started") {
        const result = await makeRechargeQuery({
          method: "DELETE",
          path: `async_batches/${batch.id}`
        });
        console.log(result);
      };
    };

  } catch(e) {
    console.error(e);
  };
};

const main = async () => {
  await run();
  process.exit(1);
};

main().catch(console.error);



