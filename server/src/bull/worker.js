/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { Worker } from "bullmq";

import { redisOptions, queueName } from "./config.js";
import { queue } from "./queue.js";

import { doRechargeQuery } from "../lib/recharge/helpers.js";

const workerOptions = {
  connection: redisOptions,
  autorun: true,
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
 */
const processor = async (job) => {
  if (job.name === "makeRechargeQuery") {
    return await doRechargeQuery(job.data);
  };
  return `${job.name} success`; // return a result?
};

const worker = new Worker(
  queueName,
  processor,
  workerOptions
);

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

worker.on('error', async (err) => {
  // log the error
  await job.log(`Worker: Failed with ${err}`);
});
  
console.log("Worker started!");
