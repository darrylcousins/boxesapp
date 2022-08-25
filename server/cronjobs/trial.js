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
import path from "path";
import dotenv from "dotenv";    
import { MongoClient } from "mongodb";

dotenv.config({ path: path.resolve("..", ".env") });

const run = async () => {

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

      const boxes = await mongodb.collection("boxes").find({delivered: "Thu Jul 14 2022"}).toArray();
      console.log(boxes);

    })
    .catch(error => console.error(`mongo connect error: ${error}`))
    .finally(() => dbClient.close());

};

const main = async () => {
  await run();
};

main().catch(console.error);
