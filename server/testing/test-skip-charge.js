/**
 * Build a query to recharge
 *
 * Run the script using `node recharge-query.js`
 *
 * @author Darryl Cousins <darryljcousins@gmail.com>
 * @module recharge-query
 */
import { exec } from "child_process";
import colors from "colors";
import inquirer from "inquirer";
import ora from "ora";
import { writeFileSync } from "fs";
import "isomorphic-fetch";

import path from "path";
import dotenv from "dotenv";    
import { MongoClient, ObjectID } from "mongodb";
import { getMongoConnection, MongoStore } from "../src/lib/mongo/mongo.js";

global._filename = (_meta) => _meta.url.split("/").pop();
dotenv.config({ path: path.resolve(_filename(import.meta), '../.env') });
global._logger = console;
global._mongodb;
_logger.notice = (e) => console.log(e);

import { getSubscription, updateSubscription, makeRechargeQuery } from "../src/lib/recharge/helpers.js";
import { gatherData, reconcileChargeGroup, reconcileGetGroups } from "../src/lib/recharge/reconcile-charge-group.js";

const run = async () => {
  global._mongodb = await getMongoConnection();
  try {

    const customer_id = 84185810;
    const { charges } = await makeRechargeQuery({
      path: `charges`,
      query: [
        ["customer_id", customer_id ],
        ["status", "queued" ],
        ["sort_by", "scheduled_at-asc" ]
      ]
    });
    if (!charges || !charges.length) {
      // return a result of none
      console.warn("No charges");
      return;
    };

    const groups = reconcileGetGroups({ charges });
    let result = [];

    for (const grouped of groups) {
      // run through each of these groups
      result = await gatherData({ grouped, result });
    };
    const subscription = result[0];
    const charge_id = subscription.attributes.charge_id;
    const purchase_item_ids = subscription.includes.map(el => el.subscription_id);

    //const charge_id = 636721786;
    console.log(charge_id);
    console.log(purchase_item_ids);


    const deliveredObj = new Date(Date.parse(subscription.attributes.nextDeliveryDate));
    deliveredObj.setDate(deliveredObj.getDate() + subscription.attributes.days);
    const updatedDelivery = deliveredObj.toDateString();

    const chargeObj = new Date(Date.parse(subscription.attributes.nextChargeDate));
    chargeObj.setDate(chargeObj.getDate() + subscription.attributes.days);
    const updatedCharge = chargeObj.toDateString();

    for (const id of purchase_item_ids) {
      const subn = await getSubscription(id, 100); // delay each to avoid pushing too many calls
      const properties = [ ...subn.properties ];
      const dateItem = properties.find(el => el.name === "Delivery Date");
      const dateIdx = properties.indexOf(dateItem);
      dateItem.value = updatedDelivery;
      properties[dateIdx] = dateItem;
      const result = await updateSubscription(id, { properties }, 500);
    };

    console.log('charge date', subscription.attributes.nextChargeDate);
    console.log('updated charge date', updatedCharge);
    console.log('delivery date', subscription.attributes.nextDeliveryDate);
    console.log('updated delivery date', updatedDelivery);

    const returned = await makeRechargeQuery({
      method: "POST",
      path: `charges/${charge_id}/skip`,
      body: JSON.stringify({ purchase_item_ids }),
    });
    console.log(JSON.stringify(returned, null, 2));

  } catch(e) {
    console.error(e);
  } finally {
    process.emit("SIGINT");
  };
};

try {
  run();
} catch(e) {
  console.log('Bleh'.red);
};


