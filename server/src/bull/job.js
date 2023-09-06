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
      removeOnComplete: 10, removeOnFail: 50
    },
  )
};

/*
 * More detail here please Darryl
 * io and session_id explanation in particular
 * @function makeApiJob
 */
export const makeApiJob = async (opts) => {

  const { io, session_id, finish } = opts;
  delete opts.io;

  /*
   * helper method
   */
  const emit = ({ io, eventName, message }) => { // args should be the rest of it
    if (io) {
      io.emit(eventName, message);
    };
  };

  const eventName = "progress";

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
      removeOnComplete: 10, removeOnFail: 50
    },
  )
  //console.log("Queued")
  emit({
    io,
    eventName,
    message: `Queued "${opts.title}" ...`
  });


  /* Not really required, just doing queued and completed
  if (io) {
    apiQueueEvents.on('progress', async ({ jobId, data }, timestamp) => {
      const job = await Job.fromId(apiQueue, jobId);
      if (typeof job.data.session_id !== "undefined") {
        console.log("job completed with session_id: ", job.data.session_id)
        emit({
          io,
          eventName,
          message: `Updating "${job.data.title}" ...`
        });
      };
    });
    apiQueueEvents.on('completed', async ({ jobId, returnvalue }) => {
      const job = await Job.fromId(apiQueue, jobId);
      if (typeof job.data.session_id !== "undefined") {
        emit({
          io,
          eventName,
          message: `Completed "${job.data.title}" ...`
        });

        if (typeof job.data.finish !== "undefined") {
          // e.g. updateSubscriptions, the last of which might emit a finished
          // event - NB finished event will close the connection at the browser
          // end, see components/sockets.jsx
          emit({
            io,
            eventName: "finished",
            message: "All jobs completed"
          });
        };
      };
    });
  };
  */

  await job.updateProgress(`Update ${opts.title} executing...`);
  /*
   * Returns one of these values: "completed", "failed", "delayed", "active", "waiting", "waiting-children", "unknown".
   */
  // const state = await job.getState();

  // This correctly waits until the job is done :)
  await job.waitUntilFinished(apiQueueEvents)

  const finished = await Job.fromId(apiQueue, job.id)

  // this will still go back to the caller
  if (parseInt(finished.returnvalue.status) > 299) {
    throw new Error(`${job.name} request failed with code ${finished.returnvalue.status}: "${finished.returnvalue.statusText}"`);
  };

  emit({
    io,
    eventName,
    message: `Completed "${opts.title}" ...`
  });

  return finished.returnvalue;
};

