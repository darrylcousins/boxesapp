/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { Worker } from "bullmq";
import colors from "colors";

import { redisOptions, apiQueueName, mailQueueName } from "./config.js";
import sendmail from "../mail/sendmail-job.js";
import { winstonLogger } from "../../config/winston.js";

const workerOptions = {
  connection: redisOptions,
  autorun: true,
};

/* Need to perform charge processes
 *
 * Also check https://docs.bullmq.io/guide/workers/sandboxed-processors
 * Sandboxing might be a good approach for mail?
 */
const mailProcessor = async (job) => {
  const shop = process.env.SHOP_NAME.padEnd(17, " ").magenta;
  winstonLogger.info(`${shop} ${job.data.to.yellow} ${job.data.subject}`);
  return await sendmail(job.data);
};

const mailWorker = new Worker(
  mailQueueName,
  mailProcessor,
  workerOptions
);

mailWorker.on('error', async (err) => {
  // log the error
  winstonLogger.error(`${"Failed".red} with ${err.message}`);
  await job.log(`Failed with ${err}`);
});
  
winstonLogger.info("Mail worker started!".green);

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
