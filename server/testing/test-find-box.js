import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { MongoClient, ObjectID } from "mongodb";
import { Shopify } from "../src/lib/shopify/index.js";
import { getMongo } from "../src/lib/mongo/mongo.js";

global._filename = (_meta) => _meta.url.split("/").pop();
dotenv.config({ path: path.resolve(_filename(import.meta), '../.env') });
global._logger = console;
global._mongodb;
_logger.notice = (e) => console.log(e);

/**
 * Testing method to find boxes - used in change-box and reconcileChargeGroup
 */

/*
 * @function findBoxes
 * @returns { fetchBox, previousBox, hasNextBox }
 */
export const findBoxes = async ({ days, nextDeliveryDate, shopify_product_id }) => {
  let fetchBox = null;
  let previousBox = null;
  let hasNextBox = false;
  let delivered = new Date(nextDeliveryDate);
  const dayOfWeek = delivered.getDay();

  console.log(nextDeliveryDate);
  const pipeline = [
    { "$match": { 
      active: true,
      shopify_product_id,
    }},
    { "$project": {
      deliverDate: {
        $dateFromString: {dateString: "$delivered", timezone: "Pacific/Auckland"}
      },
      delivered: "$delivered",
      deliverDay: { "$dayOfWeek": { $dateFromString: {dateString: "$delivered", timezone: "Pacific/Auckland"} }},
    }},
    { "$match": { deliverDay: dayOfWeek } },
    { "$project": {
      delivered: "$delivered",
      deliverDate: "$deliverDate",
      deliverDay: "$deliverDay",
    }},
  ];

  let dates = await _mongodb.collection("boxes").aggregate(pipeline).toArray();
  dates = dates.map(el => el.delivered).reverse();
  console.log(dates);

  // if our date is in the array then we have the next box
  if (dates.indexOf(delivered.toDateString()) !== -1) hasNextBox = true;

  // if not then we need to dial back the deliver date until we find a box
  if (!hasNextBox) {

    // to avoid dropping into an infinite loop first check that our date is at
    // least greater than the earliest date of the list
    if (new Date(dates[dates.length - 1]).getTime() < delivered.getTime()) {
      while (dates.indexOf(delivered.toDateString()) === -1) {
        delivered.setDate(delivered.getDate() - days);
      };
    };
  };

  // first find if the targeted date is in the list by splicing the list to that date
  for (const d of dates) {
    if (!fetchBox) {
      if (d === delivered.toDateString()) { // do we have the upcoming box? i.e. nextBox
        fetchBox = await _mongodb.collection("boxes").findOne({delivered: d});
        delivered.setDate(delivered.getDate() - days); // do we have the next box?
      };
    } else if (!previousBox) {
      if (d === delivered.toDateString()) { // do we have the upcoming box? i.e. nextBox
        previousBox = await _mongodb.collection("boxes").findOne({delivered: d});
        delivered.setDate(delivered.getDate() - days); // do we have the next box?
      };
    };
  };

  // create a mock box
  if (!fetchBox) {
    fetchBox = {
      shopify_title: "",
      includedProducts: [],
      addOnProducts: [],
    };
  };

  console.log("fetchBox", fetchBox ? fetchBox.delivered: "None");
  console.log("previousBox", previousBox ? previousBox.delivered: "None");
  console.log("hasNextBox", hasNextBox)

  return {
    fetchBox,
    previousBox,
    hasNextBox
  };
};

const run = async () => {

  //global._mongodb = await getMongoConnection(); // if mongo connection required
  // for winstonLogger to store to mongo we need a client in the process
  // regardless whether it is actually used in the script
  const { mongo: mongodb, client: dbClient } = await getMongo();
  global._mongodb = mongodb;

  //await Shopify.initialize(); // if shopify query required

  try {
    console.log('this ran');

    const order_interval_frequency = 1;
    const result = await findBoxes({
      nextDeliveryDate: "Sat Mar 09 2024",
      days: order_interval_frequency * 7,
      shopify_product_id: 6163982876822,
    });
    console.log(result);

  } catch(e) {
    console.error(e);
  } finally {
    dbClient.close();
    process.emit('SIGINT'); // will close mongo connection
  };
};

const main = async () => {
  await run();
};

main().catch(console.error);





