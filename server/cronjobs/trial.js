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
import { winstonLogger } from "../config/winston.js";
import { getMongo } from "../src/lib/mongo/mongo.js";

dotenv.config({ path: path.resolve("..", ".env") });

const main = async () => {

  // for winstonLogger to store to mongo we need a client in the process
  // regardless whether it is actually used in the script
  const { mongo: mongodb, client: dbClient } = await getMongo();

  try {
    // do something
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
