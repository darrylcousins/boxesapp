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

const _logger = console;
const _filename = (_meta) => _meta.url.split("/").pop();

// necessary path resolution for running as cron job
dotenv.config({ path: path.resolve(_filename(import.meta), "../.env") });

const pathMap = {
  'addresses': 'address',
  'customers': 'customer',
  'subscriptions': 'subscription',
  'plans': 'plan',
  'products': 'product',
  'store': 'store',
  'webhooks': 'webhook',
  'metafields': 'metafield',
  'charges': 'charge',
  'orders': 'order',
  'async_batches': 'async_batches',
};
const paths = Object.keys(pathMap);

const methods = [
  'GET',
  'POST',
  'PUT',
  'DELETE',
];

const ids = [
  "242071498",
];

const run = async () => {
  const base_url = process.env["RECHARGE_URL"];
  console.log('\nQuery Recharge Subscription App'.magenta);
  console.log(`\n${'-'.padEnd(70, '-')}`);
  console.log(`${'Api url'.padEnd(25)} ${base_url.blue}`);

  inquirer
    .prompt([
    {
      type: 'list',
      name: 'method',
      message: 'method?',
      choices: methods,
    },
    {
      type: 'list',
      name: 'path',
      message: 'path, e.g. /addresses?',
      choices: paths,
    },
    {
      type: 'text',
      name: 'id',
      message: 'Enter the id of the resource if required?',
      default: 'null',
    },
    {
      type: 'confirm',
      name: 'save',
      message: 'save the result?',
      default: false,
    }
    ]).then(async result => {
      console.log(result);
      let url = path.join(base_url, result.path);
      if (result.id !== 'null') {
        url = path.join(url, result.id);
        if (result.path === "async_batches" && result.method !== "DELETE") {
          url = path.join(url, "tasks");
        };
      };
      if (["subscriptions"].includes(result.path) && result.method !== "DELETE") {
        url = `${url}?include=metafields`;
        //url = `${url}&status=active`;
      };
      if (result.path === "metafields") {
        url = `${url}?owner_resource=subscription`;
      };
      url = encodeURI(url);
      console.log(url.blue);
      const options = {
        method: result.method,
        headers: {
          'X-RECHARGE-VERSION': process.env.RECHARGE_VERSION, 
          'X-RECHARGE-ACCESS-TOKEN': process.env.RECHARGE_ACCESS_TOKEN, 
        },
      };
      if (result.method !== "GET") {
        options.headers["Content-Type"] = "application/json";
        options.headers["Accept"] = "application/json";
        options.body = JSON.stringify({});
      };
      if (result.method === "DELETE") {
        console.log(await fetch(url, options));
      } else {
        const data = await fetch(url, options).then(result => result.json());
        if (result.save) {
          inquirer
            .prompt([
            {
              type: 'text',
              name: 'fileName',
              message: 'File name to save as',
              default: `${pathMap[result.path]}-${result.id}.json`,
            },
          ]).then(async res => {
            writeFileSync(res.fileName, JSON.stringify(data, null, 2));
            console.log(`Data saved as ${res.fileName}`);
            process.exit(1);
          });
        } else {
          console.log(JSON.stringify(data, null, 2));
          process.exit(1);
        };
      };
    })
};

try {
  await run();
  //process.exit(1);
} catch(e) {
  console.log('Bleh'.red);
};

