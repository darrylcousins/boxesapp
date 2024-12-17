/**
 * Build a query to recharge
 *
 * Run the script using `node recharge-query.js`
 *
 * @author Darryl Cousins <darryljcousins@gmail.com>
 * @module recharge-query
 *
 * Only used on development site and writes reports to the docs
 * Targets a specific customer of the development site
 * Relies on limiting activity by the customer in order to gather activity targeted data
 * Once this has been done once it may never be used again unless fundamental changes are made
 * An example might be if recharge adds frequency and last order to charge line
 *   items which would allow boxes to eliminate a couple of api calls
 */
import { exec } from "child_process";
import fs from "fs/promises";
import colors from "colors";
import inquirer from "inquirer";
import ora from "ora";
import { writeFileSync } from "fs";
import "isomorphic-fetch";

import path from "path";
import dotenv from "dotenv";    

import { getMongoConnection } from "../src/lib/mongo/mongo.js";
import buildReport from "./lib-build-report.js";

const _filename = (_meta) => _meta.url.split("/").pop();
global._mongodb = await getMongoConnection(); // if mongo connection required

// necessary path resolution for running as cron job
dotenv.config({ path: path.resolve(_filename(import.meta), "../.env") });

const obfuscate = (content) => {
  return content.toString()
    .replaceAll("cousinsd@proton", "jon.doe@mail") // email
    .replaceAll("Darryl", "Jon").replaceAll("Cousins", "Doe") // name
    .replaceAll("Taumutu", "Aroha").replaceAll("275247293", "273333333"); //address, telephone
};

const reportMap = [
  { "title": "Order created", "folder": "shopify-order-created" },
  { "title": "Charge upcoming", "folder": "recharge-charge-upcoming" },
  { "title": "Order processed", "folder": "recharge-order-processed" },
  { "title": "Reconcile subscription", "folder": "user-subscription-reconciled" },
  { "title": "Update subscription", "folder": "user-subscription-updated" },
  { "title": "Change subscription", "folder": "user-subscription-changed" },
  { "title": "Pause subscription", "folder": "user-subscription-paused" },
  { "title": "Reschedule subscription", "folder": "user-subscription-rescheduled" },
  { "title": "Cancel subscription", "folder": "user-subscription-cancelled" },
  { "title": "Reactivate subscription", "folder": "user-subscription-reactivated" },
  { "title": "Delete subscription", "folder": "user-subscription-deleted" },
  { "title": "Create subscription", "folder": "user-subscription-created" },
  { "title": "Broken create Subscription", "folder": "broken-create-subscription" },
  { "title": "Broken update Subscription", "folder": "broken-update-subscription" },
  { "title": "Not Broken create Subscription", "folder": "notbroken-create-subscription" },
];
const reports = reportMap.map(el => el.title);
const projectBase = path.resolve(_filename(import.meta), "../", "../");
// the folder that holds the saved webhooks as json files
const webhookFolder = path.join(projectBase, "server", "debug");
const mailFolder = path.join(projectBase, "server", "debug");

const run = async () => {
  console.log('\nBuild reports'.brightMagenta);
  console.log(`${projectBase}`.brightMagenta);
  console.log("Ctrl-C to exit".brightBlue);
  console.log(`${'-'.padEnd(70, '-')}`);

  await inquirer
    .prompt([
      {
        type: 'list',
        name: 'report',
        message: 'Which report to build?',
        choices: reports,
      },
      {
        type: 'text',
        name: 'datetime',
        message: 'Date/time start, UTC/ISO format',
        default: "2024-04-13T15:18:30.000Z",
      },
      {
        type: 'number',
        name: 'windback',
        message: 'Minutes to reverse',
        default: 2,
      }
    ]).then(async result => {
      const folderName = reportMap.find(el => el.title === result.report).folder;
      const reportFolder = path.join(projectBase, "docs/src/sources/json/reports", folderName);
      const mailFolderPublic = path.join(projectBase, "docs/public/mail");
      const mailFolderDist = path.join(projectBase, "docs/dist/mail");
      const ts = Date.parse(result.datetime);
      if (isNaN(ts)) {
        console.log("Cannot parse the date/time entered - exiting".red);
        process.exit(1);
      };
      try {
        await fs.mkdir(reportFolder);
      } catch (err) {
        // folder exists
      };
      try {
        await fs.access(reportFolder);
        console.log(`Found ${reportFolder}`.brightGreen);
        console.log(`${"Continuing will".brightGreen} ${"delete".red} ${"all files in".brightGreen} ${folderName.red}${"!".brightGreen}`);
        await inquirer
          .prompt([
          {
            type: 'confirm',
            name: 'continue',
            message: 'Are you sure you want to continue?',
            default: true,
          },
        ]).then(async res => {
          if (res.continue) {
            // NOTE Removing all files in the target report directory
            await fs.readdir(reportFolder)
              .then(async files => {
                for (const f of files) {
                  const fPath = path.join(reportFolder, f);
                  try {
                    await fs.unlink(fPath);
                  } catch(err) {
                    console.log(`Failed to delete file ${f} - exiting`.red);
                    process.emit('SIGINT');
                  };
                };
              })
              .catch(err => {
                console.log(`Failed to delete directory ${folderName} - exiting`.red);
                process.emit('SIGINT');
              })
            // NOTE Get all the data to save from external method
            console.log("Directory has been emptied - recovering data".green);
            try {
              let type = "webhook";
              if (folderName.startsWith("user")) type = "user";
              if (folderName.startsWith("broken")) type = "broken";
              const { report, logs, files, mail } = await buildReport({
                mailFolder,
                webhookFolder,
                dateString: result.datetime,
                deltaMinutes: result.windback,
                type,
              });
              if (report && logs.length > 0 && files.length > 0) {
                console.log("Data recovered, writing to report folder".green);
                try {
                  await fs.writeFile(path.join(reportFolder, "log.json"), 
                    obfuscate(JSON.stringify(logs, null, 2)), {
                      encoding: "utf8", 
                      flag: "w", 
                      mode: 0o666 
                    });
                  await fs.writeFile(path.join(reportFolder, "report.json"), 
                    JSON.stringify(report, null, 2), { 
                      encoding: "utf8", 
                      flag: "w", 
                      mode: 0o666 
                  });
                  for (const f of files) {
                    await fs.readFile(path.join(webhookFolder, f))
                      .then(async content => {
                        await fs.writeFile(path.join(reportFolder, f), 
                          obfuscate(content.toString()), { 
                            encoding: "utf8", 
                            flag: "w", 
                            mode: 0o666 
                          });
                        });
                  };
                  for (const f of mail) {
                    await fs.readFile(path.join(mailFolder, f))
                      .then(async content => {
                        await fs.writeFile(path.join(mailFolderPublic, `${folderName}.html`),  // renaming file
                          obfuscate(content.toString()), { 
                            encoding: "utf8", 
                            flag: "w", 
                            mode: 0o666 
                          });
                        await fs.writeFile(path.join(mailFolderDist, `${folderName}.html`),  // renaming file
                          obfuscate(content.toString()), { 
                            encoding: "utf8", 
                            flag: "w", 
                            mode: 0o666 
                          });
                        });
                  };
                } catch(err) {
                  console.error(err);
                  console.log(`Error in writing files to report folder - exiting`.red);
                  process.emit('SIGINT');
                };
              } else {
                console.log(`Insufficient data recovered to build report - exiting`.red);
                process.emit('SIGINT');
              };
            } catch(err) {
              console.error(err);
              console.log(`Error recovering data - exiting`.red);
              process.emit('SIGINT');
            };
            try {
              // write files here
            } catch(err) {
              console.error(err);
            };
          } else {
            console.log("Exiting".brightBlue);
            process.emit('SIGINT');
          };
        });
      } catch (err) {
        console.log(err);
        console.log(`Cannot access ${folderName} - exiting`.red);
        process.emit('SIGINT');
      };
    })
};

try {
  await run();
} catch(e) {
  console.log(e.message.red);
} finally {
  process.emit('SIGINT'); // will close mongo connection
};
