/**
 * Clean up logs script for boxesapp mongodb
 *
 * Set as a cron job to run nightly, all collections are exported as json files
 * and attached to an email to Darryl Cousins <darryljcousins@gmail.com>
 *
 * Run from ./logclean-cron.sh
 *
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { Readable } from "stream";
import path from "path";
import { execCommand, fileStringDate, titleCase } from "./cron-lib.js";
import sendmail from "../src/mail/sendmail-job.js";
import { getMongo } from "../src/lib/mongo/mongo.js";
import { winstonLogger } from "../config/winston.js";

import dotenv from "dotenv";    

dotenv.config({ path: path.resolve("..", ".env") });

const main = async () => {

  // for winstonLogger to store to mongo we need a client in the process
  // regardless whether it is actually used in the script
  const { mongo: mongodb, client: dbClient } = await getMongo();

  try {
    // do something
    const db = process.env.DB_NAME;
    const now = new Date();
    const since = new Date();
    since.setDate(now.getDate() - 14); // keep logs for 14 days

    const report = [];
    const query = {
      "timestamp": {
        "$lte": since
      }
    };
    const errors = await mongodb.collection("logs").find({...query, level: "error"}).toArray();
    const notices = await mongodb.collection("logs").find({...query, level: "notice"}).toArray();
    report.push(`Log clean: ${now.toString()}`);
    report.push(`Connected to database ${db}`);
    report.push("\n");
    report.push(`Exporting logs older than ${since.toString()}`);
    report.push(`Exported ${errors.length} error records`);
    report.push(`Exported ${notices.length} notice records`);

    const attachments = [];
    if (notices.length) {
      attachments.push({
        filename: `${now.toDateString()}-${db}-notice-logs.json`,
        content: Buffer.from(JSON.stringify(notices, null, 2), "utf-8"),
      });
    };
    if (errors.length) {
      attachments.push({
        filename: `${now.toDateString()}-${db}-error-logs.json`,
        content: Buffer.from(JSON.stringify(errors, null, 2), "utf-8"),
      });
    };
    if (attachments.length) {
      const result = await mongodb.collection("logs").deleteMany(query);
      report.push(`Deleted ${result.deletedCount} records`);
    } else {
      report.push(`Deleted 0 records`);
    };
    const opts = {
      to: process.env.SERVER_EMAIL,
      subject: `\[${process.env.DB_NAME}-db\] Log clean report`,
      text: report.join("\n"),
      attachments,
    };
    const sent = await sendmail(opts);
    delete opts.html;
    delete opts.attachments;
    winstonLogger.notice("Log clean report", { meta: { mail: { ...opts, ...sent } } });
  } catch(err) {
    winstonLogger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  } finally {
    await dbClient.close();
    process.exit(1);
  };

};

try {
  await main();
} catch(err) {
  winstonLogger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
};
