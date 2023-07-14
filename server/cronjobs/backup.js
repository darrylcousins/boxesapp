/**
 * Export script for boxesapp mongodb
 *
 * Set as a cron job to run nightly, all collections are exported as json files
 * and attached to an email to process.env.SERVER_EMAIL
 *
 * Run from ./backup-cron.sh
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
    const db = process.env.DB_NAME;
    const now = new Date();
    const report = [];
    const attachments = [];

    report.push(`DB backup: ${now.toString()}`);
    report.push(`Connected to database ${db}`);
    report.push("\n");

    for (const collection of ["orders", "boxes", "settings"]) {
      const records = await mongodb.collection(collection).find({}).toArray();
      report.push(`Exporting ${collection}`);
      report.push(`Exported ${records.length} ${collection}`);
      if (records.length) {
        attachments.push({
          filename: `${now.toDateString()}-${db}-${collection}.json`,
          content: Buffer.from(JSON.stringify(records, null, 2), "utf-8"),
        });
      };
      report.push("\n");
    };
    const opts = {
      to: process.env.SERVER_EMAIL,
      subject: `\[${process.env.DB_NAME}-db\] Nightly backup report`,
      text: report.join("\n"),
      attachments,
    };
    const sent = await sendmail(opts);
    delete opts.html;
    delete opts.attachments;
    winstonLogger.notice("Nightly backup report", { meta: { mail: { ...opts, ...sent } } });
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
