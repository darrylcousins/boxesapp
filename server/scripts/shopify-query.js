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
};
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
    },
    {
      type: 'confirm',
      name: 'save',
      message: 'save the result?',
      default: false,
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
      console.log(path);

      const fields = [];
      const data = await makeShopQuery({path, fields});
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
    });
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

