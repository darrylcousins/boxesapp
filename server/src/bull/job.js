/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { Job } from "bullmq";

import {
  apiQueue,
  apiQueueEvents,
  mailQueue,
  mailQueueEvents,
} from "./queue.js";

export const makeMailJob = async (opts) => {
  // opts is the job data passed to sendmail
  const job = await mailQueue.add(
    "Sendmail",
    opts,
    {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: 50, removeOnFail: 50
    },
  )
};

/*
 * More detail here please Darryl
 * io and session_id explanation in particular
 * @function makeApiJob
 */
export const makeApiJob = async (opts) => {

  const { io, session_id } = opts;
  delete opts.io;

  /*
   * helper method
   */
  const emit = ({ io, eventName, message }) => { // args should be the rest of it
    if (io) {
      io.emit(eventName, message);
    };
  };

  // opts is the job data passed to doRechargeQuery
  const job = await apiQueue.add(
    opts.processorName,
    opts,
    {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: 100, removeOnFail: 50
    },
  )
  emit({
    io,
    eventName: "progress",
    message: `Queued ${opts.title ? `"${opts.title}"` : "" } ...`
  });

  await job.updateProgress(`Update ${opts.title} executing...`);

  /*
   * Returns one of these values: "completed", "failed", "delayed", "active", "waiting", "waiting-children", "unknown".
   */
  // const state = await job.getState();

  // This correctly waits until the job is done :)
  await job.waitUntilFinished(apiQueueEvents)

  const finished = await Job.fromId(apiQueue, job.id)

  // this will still go back to the caller
  // XXX look again at this if we are no longer to waitUntilFinished!!
  if (parseInt(finished.returnvalue.status) > 299) {
    throw new Error(`${job.name} request failed with code ${finished.returnvalue.status}: "${finished.returnvalue.statusText}"`);
  };

  emit({
    io,
    eventName: "completed",
    message: `Completed "${opts.title}" (${finished.returnvalue.status})`
  });

  // return the value received from the api call
  return finished.returnvalue;
};

