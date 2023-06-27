import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { MongoClient, ObjectID } from "mongodb";
import { getMongoConnection, MongoStore } from "../src/lib/mongo/mongo.js";

global._filename = (_meta) => _meta.url.split("/").pop();
dotenv.config({ path: path.resolve(_filename(import.meta), '../.env') });
global._logger = console;
global._mongodb;
_logger.notice = (e) => console.log(e);

/**
 * Simple template for node script
 */

const run = async () => {

  global._mongodb = await getMongoConnection(); // if mongo connection required

  const collection = _mongodb.collection("logs");

  try {
    const dateStr = "2023-06-24";

    const now = new Date(new Date(dateStr).toISOString().split('T')[0]);
    console.log(now);
    console.log(now.getTime());
    console.log(new Date(now.getTime()));

    const timestamp = now.getTime();

    const today = new Date(timestamp);
    const yesterday = new Date(timestamp);
    const tomorrow = new Date(timestamp);
    yesterday.setDate(today.getDate() - 1);
    tomorrow.setDate(today.getDate() + 2);
    console.log(yesterday);
    console.log(today);
    console.log(tomorrow);

    let level = "notice";
    let object = null;

    const query = {};
    //if (level && level !== "all") query.level = level;
    if (object) query[`meta.${object}`] = { "$exists": true };
    query["$and"] = [
      {timestamp: { "$gt": yesterday }},
      {timestamp: { "$lte": tomorrow }},
    ];

    const pipeline = [
      { "$match": query },
      { "$group": {
        _id : { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
        "count": { "$sum": 1 },
      }},
      { "$sort": { _id: 1 }},
    ];

    console.log('this ran');
    const result = await collection.aggregate(pipeline).toArray();
    const final = result.reduce(
      (acc, curr) => Object.assign(acc, { [`${curr._id}`]: curr.count }),
      {});
    console.log(final);

    // update tomorrow and the query to get results for the day
    tomorrow.setDate(tomorrow.getDate() - 1);
    query["$and"] = [
      {timestamp: { "$gt": today }},
      {timestamp: { "$lt": tomorrow }},
    ];
    const logs = await collection.find(query).sort({ timestamp: -1 }).toArray();
    console.log(logs.length);

    // compile the response
    const current= today.toISOString().split("T")[0];
    const previous= yesterday.toISOString().split("T")[0];
    const next= tomorrow.toISOString().split("T")[0];
    console.log(previous, current, next);

    const response = {};
    response.previous = { date: previous, count: 0 };
    if (Object.keys(final).includes(previous)) {
      response.previous.count = final[previous];
    };

    response.current = { date: current, count: 0, logs: logs };
    if (Object.keys(final).includes(current)) {
      response.current.count = final[current];
    };

    response.next = { date: next, count: 0 };
    if (Object.keys(final).includes(next)) {
      response.next.count = final[next];
    };
    console.log(response);

  } catch(e) {
    console.error(e);
  } finally {
    process.emit('SIGINT'); // will close mongo connection
  };
};

const main = async () => {
  await run();
};

main().catch(console.error);





