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

import subscription from "../recharge.subscription.json" assert { type: "json" };
import json from "../recharge.charge.json" assert { type: "json" };

const run = async () => {
  global._mongodb = await getMongoConnection();
  try {
    console.log('this ran');
    const next_charge = "2022-09-24";
    const next_delivery = "Tue Sep 27 2022";
    const { charge } = json;
    charge.scheduled_at = next_charge;
    let delivered;
    for (const line_item of charge.line_items) {
      delivered = line_item.properties.find(el => el.name === "Delivery Date");
      delivered.value = next_delivery;
    };
    const groups = reconcileGetGroups({ charges: [ charge ] });
    let result = [];

    for (const grouped of groups) {
      // run through each of these groups
      result = await gatherData({ grouped, result });
      // if anything to new then the page will force a reload
    };
    //console.log(result);

    /*
    const grouped = {}
    grouped.charge = {
      id: null,
      scheduled_at: next_charge,
      shipping_address: subscription.address,
      address_id: subscription.attributes.address_id,
      customer: subscription.attributes.customer,
    };
    grouped.box = subscription.includes.find(el => el.subscription_id === subscription.attributes.subscription_id);
    grouped.box.images = {
      small: subscription.attributes.images[grouped.box.title]
    };
    grouped.box.purchase_item_id = subscription.attributes.subscription_id;
    grouped.included = subscription.includes.filter(el => el.subscription_id !== subscription.attributes.subscription_id);
    let d = grouped.box.properties.find(el => el.name === "Delivery Date");
    d.value = next_delivery;
    for (const group of grouped.included) {
      group.images = {
        small: subscription.attributes.images[group.title]
      };
      group.external_product_id = { ecommerce: group.shopify_product_id };
      let d = group.properties.find(el => el.name === "Delivery Date");
      d.value = next_delivery;
      group.purchase_item_id = group.subscription_id;
      group.unit_price = group.price;
    };
    console.log(grouped);
    console.log(grouped.box.properties)
    console.log(grouped.included[0].properties)
    let result = [];
    result = await gatherData({ grouped: [ grouped ], result });
    console.log(result[0]);
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







