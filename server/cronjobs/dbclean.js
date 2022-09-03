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
import sendmail from "../src/mail/sendmail.js";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve("..", ".env") });

const main = async () => {

  const username = encodeURIComponent(process.env.DB_USER);
  const password = encodeURIComponent(process.env.DB_PASSWORD);

  const mongo_uri = `mongodb://${username}:${password}@localhost/${process.env.DB_NAME}`;
  let dbClient;

  // assign the client from MongoClient
  await MongoClient
    .connect(mongo_uri, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(async (client) => {
      const mongodb = client.db();
      dbClient = client;

      const db = process.env.DB_NAME;
      const now = new Date();
      const since = new Date();
      since.setDate(now.getDate() - 7); // only keep boxes and orders for 7 days
      const report = [];
      const attachments = [];
      report.push(`DB clean: ${now.toString()}`);
      report.push(`Connected to database ${db}`);
      report.push("\n");

      for (const collection of ['orders', 'boxes']) {
        // collect distinct dates to archive and remove
        const searchDates = [];
        const dates = await mongodb.collection(collection).distinct('delivered');
        for (const d of dates) {
          if (new Date(Date.parse(d)) < since) {
            searchDates.push(d);
          };
        };
        const query = {
          delivered: {"$in": searchDates }
        };
        const records = await mongodb.collection(collection).find(query).toArray();
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
      sendmail({
        to: process.env.SERVER_EMAIL,
        subject: `\[${process.env.DB_NAME}-db\] Data clean report`,
        text: report.join("\n"),
        attachments,
      });
    })
    .catch(error => {
      throw error;
    })
    .finally(() => dbClient.close());
};

main()
  .catch((err) => {
    console.log(`\[${process.env.DB_NAME}-db\] Data clean errors`);
    console.log(err.toString());
    process.exit(1);
});
