/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { Worker } from "bullmq";
import colors from "colors";

import { redisOptions, apiQueueName, mailQueueName } from "./config.js";

import { doRechargeQuery } from "../lib/recharge/helpers.js";
import { doShopQuery } from "../lib/shopify/helpers.js";
import { winstonLogger } from "../../config/winston.js";
import { getMongo } from "../lib/mongo/mongo.js";

const workerOptions = {
  connection: redisOptions,
  autorun: true,
  limiter: {
    max: 1, // limit the queue to a maximum of 1 jobs per 500 milliseconds
    duration: 500, // this avoids a burst of 2 calls then idle 1 second
  },
};

const color = (str, color) => {
  if (typeof str === "undefined") {
    return "undefined".grey;
  };
  return `${str}`[color];
};

/* process the data */
const apiProcessor = async (job) => {
  let returnvalue;
  if (job.name === "makeRechargeQuery") {
    returnvalue = await doRechargeQuery(job.data);
  };
  if (job.name === "makeShopQuery") {
    returnvalue = await doShopQuery(job.data);
  };
  const { method, status, statusText, title } = returnvalue;
  let log = `\
${color(process.env.SHOP_NAME.padEnd(17, " "), "magenta")} \
${color(job.name.padEnd(17, " "), "brightWhite")} \
${color(method, "green")} \
${color(status, "yellow")} \
${color(statusText, "blue")} \
${title ? color(title, "white") : ""}
${JSON.stringify(job.data, null, 2)}
  `;
  if (parseInt(process.env.DEBUG) === 1) {
    const { mongo, client } = await getMongo(); // must close connection myself client.close()
    const mapper = (acc, curr, idx) => {
      const [key, value] = curr;
      return { ...acc, [key]: value };
    };
    if (Object.hasOwn(job.data, "query")) job.data.query = job.data.query.reduce(mapper, {});
    if (Object.hasOwn(job.data, "body")) job.data.body = JSON.parse(job.data.body);
    const data = { ...job.data };
    data.method = method;
    data.status = `${status} ${statusText}`;
    delete data.processorName;
    let name = "Recharge";
    if (job.data.processorName !== "makeRechargeQuery") { // makeShopifyQuery
      name = "Shopify"; // one or the other
    };
    let message = `API call to ${name}`;
    name = name.toLowerCase();
    try {
      const doc = {
        timestamp: new Date(),
        level: "notice",
        message,
        meta: {
          [name]: data
        }
      };
      const result = await mongo.collection("logs").insertOne(doc);
    } finally {
      await client.close();
    };
  };
  winstonLogger.info(log);
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
