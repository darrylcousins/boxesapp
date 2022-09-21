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
      since.setDate(now.getDate() - 3); // only keep logs for 3 days

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
      sendmail({
        to: process.env.SERVER_EMAIL,
        subject: `\[${process.env.DB_NAME}-db\] Log clean report`,
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
    console.log(`\[${process.env.DB_NAME}-db\] Log clean errors`);
    console.log(err.toString());
    process.exit(1);
});
