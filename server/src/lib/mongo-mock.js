/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { resolve } from "path";
import "dotenv/config";
/**
  * Mongodb mock connection for tests
  *
 */

export async function getMockConnection() {

  const mongodb = await import("mongo-mock");
  const dbFile = resolve(process.cwd(), "mongo.js");

  //mongodb.max_delay = 0;//you can choose to NOT pretend to be async (default is 400ms)
  const MongoClient = mongodb.MongoClient;
  MongoClient.persist = dbFile;
  MongoClient.max_delay = 0;
  const mongo_uri = 'mongodb://localhost:27017/boxesapp';

  // assign the client from MongoClient
  return await MongoClient
    .connect(mongo_uri)
    .then(async (client) => {

      return client.db();
    })
    .catch(err => {
      console.error({message: err.message, level: err.level, stack: err.stack, meta: err});
    });
};
