/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import fs from "fs";
import { Worker } from "bullmq";
import colors from "colors";
import sharp from "sharp";
import "dotenv/config";

import { redisOptions, imageQueueName } from "./config.js";

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
const imageProcessor = async (job) => {
  try {
    const path = `${process.env.SERVER_ROOT}/assets/product-images/${job.data.id}.jpg`;

    if (fs.existsSync(path)) {
      winstonLogger.info(`Path exists ${path}`);
      return `${path} exists, exiting`;
    };
    winstonLogger.info(`Appear to be here with ${path}`);

    const image_data = await fetch(job.data.url);
    const blob = await image_data.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    sharp(buffer)
      .resize(40, 40, { fit: "cover" })
      .toFile(path);
    winstonLogger.info(`Fetched and saved ${path}`);
    return `Fetched and saved ${path}`;
  } catch(err) {
    winstonLogger.error(`${"Failed".red} with ${err.message}`);
    throw err;
  };
};

const imageWorker = new Worker(
  imageQueueName,
  imageProcessor,
  workerOptions
);

imageWorker.on('error', async (err) => {
  // log the error
  winstonLogger.error(`${"Failed".red} with ${err.message}`);
  await job.log(`Failed with ${err}`);
});
  
winstonLogger.info("Image worker started!".green);
