/**
 * Build a query to remove all recharge objects of a type
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
import "isomorphic-fetch";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import "isomorphic-fetch";

const _filename = (_meta) => _meta.url.split("/").pop();
/**
 * remove all subscriptions from recharge
 */

// necessary path resolution for running as cron job
dotenv.config({ path: path.resolve(_filename(import.meta), '../.env') });

const paths = [
  'subscriptions',
  'webhooks',
  /*
  'addresses',
  'customers',
  'plans',
  'products',
  'store',
  'metafields',
  'charges',
  */
];

const base_url = process.env.RECHARGE_URL;

const run = async () => {
  const base_url = process.env["RECHARGE_URL"];
  console.log('\nRemove all objects of a type from Recharge'.magenta);
  console.log(`\n${'-'.padEnd(70, '-')}`);
  console.log(`${'Api url'.padEnd(25)} ${base_url.blue}`);

  inquirer
    .prompt([
      {
        type: 'list',
        name: 'type',
        message: 'Object type to remove ... ',
        choices: paths,
      },
    ]).then(async result => {
      const type = result.type;
      inquirer
        .prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: `Are you sure you want to remove all ${type}?`.red,
          },
        ]).then(async result => {
          if (result.confirm) {
            const ids = await getAll(type);
            inquirer
              .prompt([
                {
                  type: 'confirm',
                  name: 'confirm',
                  message: `Removing ${ids.length} ${type}. Please confirm.`.red,
                },
            ]).then(async result => {
              if (result.confirm) {
                await deleteAll(ids, type);
                if (type === "webhooks") {
                  console.log("Don't forget to delete from db.registry!".red);
                };
              } else {
                console.log("Operation cancelled. Exiting");
              };
            });
          };
      });
  });
};

const getAll = async (type) => {
  let url = base_url + "/" + type;
  const options = {
    method: "GET",
    headers: {
      'Content-Type': 'application/json',
      'X-RECHARGE-VERSION': process.env.RECHARGE_VERSION, 
      'X-RECHARGE-ACCESS-TOKEN': process.env.RECHARGE_ACCESS_TOKEN, 
    },
  };
  const data = await fetch(url, options).then(result => result.json());
  let obs = data[type];
  if (type === "subscriptions") {
    obs = obs.filter(el => el.customer_id !== 91048167);
  };
  const ids = obs.map(el => el.id);
  return ids;
};

const deleteAll = async (ids, type) => {
  let url = base_url + "/" + type;
  const start = url;
  for (const id of ids) {
    console.log(`Removing id ${id} from ${type}`.blue);
    const options = {
      method: "DELETE",
      headers: {
        'X-RECHARGE-VERSION': process.env.RECHARGE_VERSION, 
        'X-RECHARGE-ACCESS-TOKEN': process.env.RECHARGE_ACCESS_TOKEN, 
      }
    };
    url = start + "/" + `${id}`;
    const res = await fetch(url, options).then(result => result);
    //console.log(res);
  };
};

const main = async () => {
  await run();
};

main().catch(console.error);





