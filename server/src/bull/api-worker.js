/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { Worker } from "bullmq";
import colors from "colors";

import { redisOptions, apiQueueName, mailQueueName } from "./config.js";

import { doRechargeQuery } from "../lib/recharge/helpers.js";
import { doShopQuery } from "../lib/shopify/helpers.js";
import { winstonLogger } from "../../config/winston.js";

const workerOptions = {
  connection: redisOptions,
  autorun: true,
  limiter: {
    max: 3, // limit the queue to a maximum of 3 jobs per 1 second
    duration: 1000, // limit the queue to a maximum of 3 jobs per 1 second
  },
};

/* process the data */
/* Need to perform charge processes
 * All calls need to on the same queue !?
 *
 * 1. updateDeliveryDate: On webhook order_processed, update each subscription with new delivery date
 *
 *
 * Note that a processor can optionally return a value. This value can be
 * retrieved either by getting the job and accessing the "returnvalue" property
 * or by listening to the "completed" event:
 *
 * Also check https://docs.bullmq.io/guide/workers/sandboxed-processors
 * Sandboxing might be a good approach for mail?
 */
const color = (str, color) => {
  if (typeof str === "undefined") {
    return "undefined".grey;
  };
  return `${str}`[color];
};

const apiProcessor = async (job) => {
  let returnvalue;
  if (job.name === "makeRechargeQuery") {
    returnvalue = await doRechargeQuery(job.data);
  };
  if (job.name === "makeShopQuery") {
    returnvalue = await doShopQuery(job.data);
  };
  const { method, status, statusText, title } = returnvalue;
  winstonLogger.info(`\
${color(process.env.SHOP_NAME.padEnd(17, " "), "magenta")} \
${color(job.name.padEnd(17, " "), "brightWhite")} \
${color(method, "green")} \
${color(status, "yellow")} \
${color(statusText, "blue")} \
${title ? color(title, "white") : ""}\
  `);
  return returnvalue;
};

const apiWorker = new Worker(
  apiQueueName,
  apiProcessor,
  workerOptions
);

apiWorker.on('error', async (err) => {
  // log the error
  winstonLogger.error(`${"Failed".red} with ${err.message}`);
  await job.log(`Failed with ${err}`);
});
  
winstonLogger.info("Api worker started!".green);

/*
worker.on('completed', async (job, returnvalue) => {
  await job.log(`Worker: ${job.name} job with id ${job.id} has completed with result ${returnvalue}!`);
  //console.info(returnvalue);
});

worker.on('failed', async (job, err) => {
  await job.log(`Worker: ${job.name} job with id ${job.id} and data ${JSON.stringify(job.data)} has failed with ${err.message}`);
});

worker.on('progress', async (job, progress) => {
  await job.log(`Worker: ${job.name} with id ${job.id} and data ${JSON.stringify(job.data)} has progressed with ${progress}`);
});
*/
