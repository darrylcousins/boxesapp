import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { MongoClient, ObjectID } from "mongodb";
import { getMongoConnection, MongoStore } from "../src/lib/mongo/mongo.js";
import { gatherData, reconcileChargeGroup, reconcileGetGroups } from "../src/lib/recharge/reconcile-charge-group.js";
import reactivatedGroup from "../src/api/recharge/recharge-reactivated-subscription.js";

global._filename = (_meta) => _meta.url.split("/").pop();
dotenv.config({ path: path.resolve(_filename(import.meta), '../.env') });
global._logger = console;
global._mongodb;
_logger.notice = (e) => console.log(e);

import grouped from "../recharge.276264962.json" assert { type: "json" };
import address from "../recharge.address.json" assert { type: "json" };
import customer from "../recharge.customer.json" assert { type: "json" };

const run = async () => {
  global._mongodb = await getMongoConnection();
  try {
    console.log('this ran');
    const req = { body: grouped };
    await reactivatedGroup(req);

    /*
    grouped.box.images = { small: null };
    grouped.box.title = grouped.box.product_title;
    grouped.box.unit_price = grouped.box.price;
    for (const el of grouped.included) {
      el.images = { small: null };
      el.title = el.product_title;
      el.unit_price = el.price;
    };
    grouped.charge = {
      id: null,
      scheduled_at: null,
      shipping_address: address.address,
      address_id: address.address.id,
      customer: customer.customer,
    };

    let result = [];
    result = await gatherData({ grouped: [ grouped ], result });
    console.log(result);
    */

  } catch(e) {
    console.error(e);
  } finally {
    process.emit('SIGINT'); // should close mongo connection
  };
};

const main = async () => {
  await run();
};

main().catch(console.error);






