/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import "dotenv/config";
/**
  * Mongodb helper methods
  *
 */
export async function getMongoConnection() {

  const { MongoClient } = await import("mongodb");

  const username = encodeURIComponent(process.env.DB_USER);
  const password = encodeURIComponent(process.env.DB_PASSWORD);

  const mongo_uri = `mongodb://${username}:${password}@localhost/${process.env.DB_NAME}`;
  let dbClient;

  // assign the client from MongoClient
  return await MongoClient
    .connect(mongo_uri, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(async (client) => {
      const DB = client.db();

      dbClient = client;

      // listen for the signal interruption (ctrl-c)
      process.on('SIGINT', () => {
        dbClient.close();
        _logger.info(`${_filename(import.meta)} closing mongo dbClient connection`);
        process.exit();
      });

      return DB;
    })
    .catch(err => {
      _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
    });
};

/*
 * @function mongoRemove
 */
export const mongoRemove = async (collection, data) => {
  const { _id, ...parts } = data;
  _logger.info(`${_filename(import.meta)} removing ${_id}`);
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
