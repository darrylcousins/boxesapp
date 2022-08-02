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
import "isomorphic-fetch";

import path from "path";
import dotenv from "dotenv";    

const _logger = console;
const _filename = (_meta) => _meta.url.split("/").pop();

// necessary path resolution for running as cron job
dotenv.config({ path: path.resolve(_filename(import.meta), "../.env") });

const paths = [
  'products',
  'variants',
  'customers',
  'webhooks',
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
        path = `${path}/${result.id}`;
      };
      path = `${path}.json`;

      const url = `https://${process.env.SHOP_NAME}.myshopify.com/admin/api/${process.env.SHOPIFY_API_VERSION}/${path}`;
      console.log(url);

      const queryResults = await fetch(encodeURI(url), {
        method: result.method,
        headers: {
          'X-Shopify-Access-Token': process.env.SHOPIFY_API_PASSWORD 
        }
      })
        .then(response => response.json())

      console.log(queryResults);
      //console.log(JSON.stringify(queryResults, null, 2));
    })
};

try {
  run();
} catch(e) {
  console.log(e.toString().red);
};



