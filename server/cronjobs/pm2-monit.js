/**
 * Check that the server is running
 *
 * Set as a cron job to run every few minutes, if server down then email to
 * Darryl Cousins <darryljcousins@gmail.com>
 *
 * Run from ./pm2-monit.sh
 *
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import path from "path";
import fs from "fs";
import dotenv from "dotenv";    
import { winstonLogger } from "../config/winston.js";
import { getMongo } from "../src/lib/mongo/mongo.js";

// not using queue because that may be the one down
import sendmail from "../src/mail/sendmail-job.js";

dotenv.config({ path: path.resolve("..", ".env") });

const main = async () => {

  const { mongo, client } = await getMongo();

  try {
    const procs = ["southbridge", "api-worker", "mail-worker"];
    const piddir = "/home/cousinsd/.pm2/pids";

    const files = fs.readdirSync(piddir).map(el => {
      return el.split("-").slice(0, -1).join("-");
    });
    const missing = [];
    for (const proc of procs) {
      if (!files.includes(proc)) {
        missing.push(proc);
      };
    };
    const len = missing.length;
    if (len > 0) {
      const title = `Process${len > 1 ? "es" : ""}`;
      const subject = `${title} ${missing.join(", ")} ${len > 1 ? "are" : "is"} not running`;
      const opts = {
        to: process.env.SERVER_EMAIL,
        subject: `\[${process.env.DB_NAME}\] [ERROR] ${subject}`,
        text: `${subject}`,
      };
      const sent = await sendmail(opts);
      // try to restart it - always on --no-autorestart ?
      delete opts.html;
      delete opts.attachments;
      winstonLogger.notice("Process Monitor", { meta: { mail: { ...opts, ...sent } } });
    };
  } catch(err) {
    winstonLogger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  } finally {
    await client.close();
    process.exit(1);
  };

};

try {
  await main();
} catch(err) {
  winstonLogger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
};
