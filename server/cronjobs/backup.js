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
      sendmail({
        to: process.env.SERVER_EMAIL,
        subject: `\[${process.env.DB_NAME}-db\] Nightly backup report`,
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
    console.log(`\[${process.env.DB_NAME}-db\] Nightly backup report`);
    console.log(err.toString());
    process.exit(1);
});
