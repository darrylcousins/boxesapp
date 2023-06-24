/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { Queue, QueueEvents } from "bullmq";

import { redisOptions, queueName } from "./config.js";

/* Queue */
export const queue = new Queue(queueName, {
  connection: redisOptions,
  /*
  limiter: {
    max: 3, // limit the queue to a maximum of 3 jobs per 1 second
    duration: 1000, // limit the queue to a maximum of 3 jobs per 1 second
  },
  */
});

export const queueEvents = new QueueEvents(queueName, {
  connection: redisOptions,
});
