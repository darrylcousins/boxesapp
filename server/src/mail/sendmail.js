/*
 * @module mail/sendmail.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import "dotenv/config";
import { makeMailJob } from "../bull/job.js";

export default async (opts) => {
  return await makeMailJob(opts);
};


