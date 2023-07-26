/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { Queue, QueueEvents } from "bullmq";

import {
  redisOptions,
  apiQueueName,
  mailQueueName,
  imageQueueName,
} from "./config.js";

/* Queues and QueueEvents */
export const apiQueue = new Queue(apiQueueName, {
  connection: redisOptions,
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

export const imageQueue = new Queue(imageQueueName, {
  connection: redisOptions,
});

export const imageQueueEvents = new QueueEvents(imageQueueName, {
  connection: redisOptions,
});
