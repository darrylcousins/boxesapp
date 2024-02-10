/**
 * Database clean script
 *
 * Set as a cron job to run weekly, boxes and orders collections are exported as json and converted to csv files and both are
 * attached to an email to Darryl Cousins <darryljcousins@gmail.com>
 * After which orders and boxes older than last week are removed.
 *
 * Run from ./dbclean-cron.sh
 *
 * @author Darryl Cousins <darryljcousins@gmail.com>
 * @module dbclean
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

  // for the development site I want to automatically duplicate boxes each week

  try {

    const db = process.env.DB_NAME;
    const now = new Date();
    const since = new Date();
    const report = [];
    const attachments = [];
    report.push(`DB clean: ${now.toString()}`);
    report.push(`Connected to database ${db}`);
    report.push("\n");

    for (const collection of ['orders', 'boxes']) {

      const delta = collection === "boxes" ? 21 : 14;
      since.setDate(now.getDate() - delta); // keep boxes and orders for 21 days
      // collect distinct dates to archive and remove
      const searchDates = [];
      const dates = await mongodb.collection(collection).distinct('delivered');
      console.log(dates);
      for (const d of dates) {
        if (new Date(Date.parse(d)) < since) {
          searchDates.push(d);
        };
      };
      const query = {
        delivered: {"$in": searchDates }
      };
      console.log(query);
      const records = await mongodb.collection(collection).find(query).toArray();

      /* 
       * Separate routine to duplicate boxes forward for dev site because
       * otherwise everytime I come back to testing or development I have no
       * boxes to work with
       */
      if (process.env.DB_NAME === "southbridge" && collection === "boxes") {
        // duplicate forward a week if not already done
        since.setDate(now.getDate() - 7); // keep boxes and orders for 21 days
        const weekDates = [];
        for (const d of dates) {
          const current = new Date(Date.parse(d));
          if (current <= now && current > since) {
            weekDates.push(d);
          };
        };
        //console.log("dates", weekDates);
        const boxes = await mongodb.collection(collection).find(query).toArray();
        if (boxes.length) {
          for (const record of boxes) {
            //console.log(record);
          };
        };
      };

      report.push(`Exporting ${collection} older than ${since.toDateString()}`);
      report.push(`Exported ${records.length} ${collection}`);
      if (records.length) {
        attachments.push({
          filename: `${now.toDateString()}-${db}-${collection}.json`,
          content: Buffer.from(JSON.stringify(records, null, 2), "utf-8"),
        });
        const result = await mongodb.collection(collection).deleteMany(query);
        report.push(`Deleted ${result.deletedCount} ${collection}`);
      } else {
        report.push(`Deleted 0 ${collection}`);
      };
      report.push("\n");
    };
    const opts = {
      to: process.env.SERVER_EMAIL,
      subject: `\[${process.env.DB_NAME}-db\] Data clean report`,
      text: report.join("\n"),
      attachments,
    };
    const sent = await sendmail(opts);
    delete opts.html;
    delete opts.attachments;
    winstonLogger.notice("Data clean report", { meta: { mail: { ...opts, ...sent } } });
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
