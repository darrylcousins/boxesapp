/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { Queue, QueueEvents } from "bullmq";

import { redisOptions, apiQueueName, mailQueueName } from "./config.js";

/* Queue */
export const apiQueue = new Queue(apiQueueName, {
  connection: redisOptions,
  /*
  limiter: {
    max: 3, // limit the queue to a maximum of 3 jobs per 1 second
    duration: 1000, // limit the queue to a maximum of 3 jobs per 1 second
  },
  */
});

export const apiQueueEvents = new QueueEvents(apiQueueName, {
  connection: redisOptions,
});

export const mailQueue = new Queue(mailQueueName, {
  connection: redisOptions,
});

export const mailQueueEvents = new QueueEvents(mailQueueName, {
  connection: redisOptions,
});
