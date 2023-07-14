/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { Job } from "bullmq";

import { apiQueue, apiQueueEvents, mailQueue, mailQueueEvents } from "./queue.js";

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
      removeOnComplete: 50, removeOnFail: 500
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

  const emit = ({ io, eventName, message }) => { // args should be the rest of it
    return;
    if (io) {
      io.emit(eventName, message);
    };
  };

  const eventName = "uploadProgress";
  const title = (typeof opts.title !== "undefined") ? `"${opts.title}"` : "";

  emit({
    io,
    eventName,
    message: `${session_id} Received query continue...`
  });

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
      removeOnComplete: 100, removeOnFail: 500
    },
  )
  //console.log("Queued")
  emit({
    io,
    eventName,
    message: `Queued ${title} update...`
  });


  if (io) {
    apiQueueEvents.on('progress', async ({ jobId, data }, timestamp) => {
      const job = await Job.fromId(apiQueue, jobId);
      if (typeof job.data.session_id !== "undefined") {
        console.log("job completed with session_id: ", job.data.session_id)
        const title = (typeof job.data.title !== "undefined") ? job.data.title : "";
        emit({
          io,
          eventName,
          message: `Updating ${title}...`
        });
      };
    });
    apiQueueEvents.on('completed', async ({ jobId, returnvalue }) => {
      const job = await Job.fromId(apiQueue, jobId);
      if (typeof job.data.session_id !== "undefined") {
        console.log("job completed with session_id: ", job.data.session_id)
        const title = (typeof job.data.title !== "undefined") ? job.data.title : "";
        emit({
          io,
          eventName,
          message: `Update ${title} completed...`
        });
        if (typeof job.data.finish !== "undefined") {
          // e.g. updateSubscriptions
          console.log("all jobs completed: ", job.data.session_id)
          emit({
            io,
            eventName: "finished",
            message: job.data.session_id
          });
        };
      };
    });
  };

  await job.updateProgress(`Update ${title} executing...`);
  /*
   * Returns one of these values: "completed", "failed", "delayed", "active", "waiting", "waiting-children", "unknown".
   */
  // const state = await job.getState();

  // This correctly waits until the job is done :)
  await job.waitUntilFinished(apiQueueEvents)
  //console.log("Done");

  const finished = await Job.fromId(apiQueue, job.id)

  // this will still go back to the caller
  if (parseInt(finished.returnvalue.status) > 299) {
    throw new Error(`Recharge request failed with code ${status}: "${statusText}"`);
  };

  return finished.returnvalue;
};

