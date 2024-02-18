/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import "dotenv/config";
import { winstonLogger } from "../../../config/winston.js"
/**
  * Mongodb helper methods
  *
 */

async function makeMongoConnection() {

  const { MongoClient } = await import("mongodb");

  const username = encodeURIComponent(process.env.DB_USER);
  const password = encodeURIComponent(process.env.DB_PASSWORD);

  const mongo_uri = `mongodb://${username}:${password}@localhost/${process.env.DB_NAME}`;
  let dbClient;

  // assign the client from MongoClient
  return await MongoClient
    .connect(mongo_uri)
    .then(async (client) => {
      const DB = client.db();

      dbClient = client;

      return { DB, dbClient };
    })
    .catch(err => {
      winstonLogger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
    });
};

/*
 * In this case it is the resposibility of the caller to close the connection
 * Only used so far in makeShopQuery which is called in a separate process from worker
 * @function getMong
 */
export const getMongo = async () => {
  let mongo;
  if (typeof _mongodb === "undefined") {
    const { DB, dbClient } = await makeMongoConnection();
    return { mongo: DB, client: dbClient };
  };
  return { mongo: _mongodb, client: null };
};

export async function getMongoConnection() {

  const { DB, dbClient } = await makeMongoConnection();

  // listen for the signal interruption (ctrl-c)
  process.on('SIGINT', () => {
    dbClient.close();
    winstonLogger.info(`Closing mongo dbClient connection`);
    process.exit();
  });

  return DB;
};

/*
 * @function mongoRemove
 */
export const mongoRemove = async (collection, data) => {
  const { _id, ...parts } = data;
  return await collection.deleteOne(
    { _id }
  );
};

/*
 * @function mongoRemove
 */
export const mongoUpdate = async (collection, data) => {
  const { _id, ...parts } = data;
  return await collection.updateOne(
    { _id },
    { $set: { ...parts } },
    { upsert: false }
  );
};

export const mongoInsert = async (collection, data) => {
  const { _id, ...parts } = data;
  return await collection.updateOne(
    { _id },
    { $setOnInsert: { ...parts } },
    { upsert: true }
  );
};

/*
 * @class mongoStore
 * Used by Shopify and Recharge to manage access keys
 */
export class MongoStore {

  constructor({ mongodb, collection }) {
    // dbName is "collection" name
    this._mongodb = mongodb;
    this.collection = collection;
  };

  async getItem(query) {
    const doc = await this._mongodb.collection(this.collection).findOne(query);
    return doc;
  };

  async setItem(doc, query) {
    const options = { upsert: true };
    const updateDoc = { $set: doc };
    const result = await this._mongodb.collection(this.collection).updateOne(
      query, updateDoc, options
    );
    return doc;
  };

};
