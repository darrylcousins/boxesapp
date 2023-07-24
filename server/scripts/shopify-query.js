/**
 * Build a query to shopify
 *
 * Run the script using `node shopify-query.js`
 *
 * @author Darryl Cousins <darryljcousins@gmail.com>
 * @module shopify-query
 */
import { exec } from "child_process";
import colors from "colors";
import inquirer from "inquirer";
import ora from "ora";
import { writeFileSync } from "fs";
import "isomorphic-fetch";

import path from "path";
import dotenv from "dotenv";    

import { doShopQuery, makeShopQuery } from "../src/lib/shopify/helpers.js";
import { Shopify } from "../src/lib/shopify/index.js";
import { getMongoConnection, MongoStore } from "../src/lib/mongo/mongo.js";

global._filename = (_meta) => _meta.url.split("/").pop();
dotenv.config({ path: path.resolve(_filename(import.meta), '../.env') });
global._logger = console;
global._mongodb;
_logger.notice = (e) => console.log(e);

/**
 * Simple template for node script
 */

const paths = [
  'products',
  'variants',
  'images', // searches on product_id
  'customers',
  'webhooks',
  'orders',
];

const methods = [
  'GET',
];

const run = async () => {
  console.log('\nQuery Shopify Store'.magenta);
  console.log(`\n${'-'.padEnd(70, '-')}`);

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
      message: 'id?',
      default: 'null',
    }
    ]).then(async result => {
      console.log(result);

      let path = `${result.path}`;
      if (result.id !== 'null') {
        if (path === "images") {
          path = `products/${result.id}/${path}`;
        } else {
          path = `${path}/${result.id}`;
        };
      };
      path = `${path}.json`;

      const fields = [];
      const queryResult = await makeShopQuery({path, fields})
      console.log(path);
      console.log(queryResult);
      //console.log(JSON.stringify(queryResults, null, 2));
      //writeFileSync("shopify.order.json", JSON.stringify(queryResult, null, 2));
    })
};



const main = async () => {
  try {
    global._mongodb = await getMongoConnection(); // if mongo connection required
    await Shopify.initialize(); // if shopify query required
    await run();
  } catch(e) {
    console.log(e.toString().red);
    //} finally { // failed to get this to work
    //process.emit('SIGINT'); // will close mongo connection
  };
};

main().catch(console.error);

