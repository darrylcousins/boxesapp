import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";
import { MongoClient, ObjectId } from "mongodb";
import { Shopify } from "../src/lib/shopify/index.js";
import { getMongo, getMongoConnection } from "../src/lib/mongo/mongo.js";
import { winstonLogger } from "../config/winston.js";

global._filename = (_meta) => _meta.url.split("/").pop();
dotenv.config({ path: path.resolve(_filename(import.meta), '../.env') });
global._logger = console;
global._mongodb;
_logger.notice = (e) => console.log(e);

/**
 * Simple template for node script
 */

const run = async () => {

  // this one closes the connection on SIGINT
  global._mongodb = await getMongoConnection(); // if mongo connection required


  try {
    // can log messages if required
    console.log("");

    // Step one: collect files from debug at a timestamp delta - utc time

    let folder = "./debug";
    let dateString = "2024-03-19T04:07:00Z";
    // NOTE try to land about the middle, we go 4 minutes either side

    const d = new Date(Date.parse(dateString));
    d.setMinutes(d.getMinutes() - 4);

    const startTime = new Date(d);
    let start = startTime.toISOString().replace("T", "-").replace("Z", "");
    console.log("start", startTime.toISOString().replace("T", " ").replace("Z", ""))

    d.setMinutes(d.getMinutes() + 8);
    const endTime = new Date(d);
    let end = endTime.toISOString().replace("T", "-").replace("Z", "");
    console.log("end", endTime.toISOString().replace("T", " ").replace("Z", ""))

    // list files in debug, sort by timestamp and filter somehow
    const collectFiles = [];
    const allHooks = [];

    const getDate = (f) => {
      const split = f.split("-");
      const day = split.slice(2, 5).join("-");
      const time = split[5];
      return new Date(Date.parse(`${day}T${time}Z`));
    };

    const sort = (a, b) => {
      const timeA = getDate(a).getTime();
      const timeB = getDate(b).getTime();
      if (timeA < timeB) return -1;
      if (timeA > timeB) return 1;
      return 0;
    };

    let recharge_subscription_ids = [];
    let recharge_charge_ids = [];
    let recharge_order_ids = [];
    let shopify_order_ids = [];
    const customer_email = "cousins@proton.me";
    const customer_id = 84185810;
    const regexEmail = new RegExp(/cousinsd@proton.me/); // email is common between shopify and recharge
    const regexCustomer = new RegExp(/84185810/); // email is common between shopify and recharge
    await fs.readdir(folder)
      .then(async files => {
        for (const f of files.sort(sort)) {
          const fileDate = getDate(f);
          if (startTime.getTime() < fileDate.getTime() &&  fileDate.getTime() < endTime.getTime()) {
            await fs.readFile(path.join(folder, f))
              .then(content => {
                if (regexEmail.test(content) || regexCustomer.test(content)) {

                  const parts = f.split(".");
                  const subparts = parts[1].split("-")
                  const key = subparts[0];
                  const partner = parts[0];
                  const webhook = subparts[1];
                  const day = subparts.slice(2, 5).join("/");
                  const milliseconds = parts[2].split("-")[0];
                  const objId = parts[2].split("-")[1];

                  const json = JSON.parse(content, null, 2);
                  const obj = json[key];

                  collectFiles.push(f);
                  allHooks.push(webhook);

                  if (partner === "shopify") {
                    if (key === "order") shopify_order_ids.push(obj.id);
                  };
                  if (partner === "recharge") {
                    shopify_order_ids.push(obj.external_order_id.ecommerce);
                    if (key === "order") {
                      recharge_order_ids.push(obj.id);
                      recharge_charge_ids.push(obj.charge.id);
                    };
                    if (key === "charge") recharge_charge_ids.push(obj.id);
                    for (const item of obj.line_items) {
                      if (item.properties.some(el => el.name === "box_subscription_id")) {
                        recharge_subscription_ids.push(item.purchase_item_id);
                      };
                    };
                  };
                  console.log("");
                };
              });
          };
        };
      });
    recharge_subscription_ids = Array.from(new Set(recharge_subscription_ids));
    console.log("rc subscription ids", recharge_subscription_ids);
    recharge_charge_ids = Array.from(new Set(recharge_charge_ids));
    console.log("rc charge ids", recharge_charge_ids);
    recharge_order_ids = Array.from(new Set(recharge_order_ids));
    console.log("rc order ids", recharge_order_ids);
    shopify_order_ids = shopify_order_ids.map(el => parseInt(el)).filter(el => el);
    shopify_order_ids = Array.from(new Set(shopify_order_ids));
    console.log("shopify order ids", shopify_order_ids);
 
    // Step two: collect mongo logs at a timestamp delta - utc time

    // query should include our customer_id meta.recharge.customer_id
    // query should include path/subscription_id meta.recharge.path
    // query should include path/charge_id ?? meta.recharge.path
    // query should include charges with query meta.recharage.query includes curstomer_id
    // query should include subscriptions with query subscription_ids
    // query should include the shopify api call Get Order - ecommerve id in path orders/id.json

    const query = {};

    query.timestamp = {"$gte": startTime, "$lt": endTime };
    const res = await _mongodb.collection("logs").find(query).sort({timestamp: 1}).toArray();
    console.log("here", res.length);
    /*
    for (const log of res) {
      console.log(log);
    };
    */
    query["$or"] = [];
    query["$or"].push({
      "meta.recharge.customer_id": { "$eq": customer_id, "$exists": true },
    });
    query["$or"].push({
      "meta.order.customer_id": { "$eq": customer_id, "$exists": true },
    });
    query["$or"].push({
      "meta.recharge.query.customer_id": { "$eq": customer_id, "$exists": true },
    });
    for (const id of recharge_subscription_ids) {
      query["$or"].push({
        "meta.recharge.path": { "$regex": `.*${id}$` , "$exists": true },
      });
      query["$or"].push({
        "$and": [
          { "meta.recharge.query.ids": { "$exists": true } },
          { "meta.recharge.query.ids": { "$elemMatch": { "$eq": id.toString() } } },
        ],
      });
    };
    for (const id of recharge_charge_ids) {
      query["$or"].push({
        "meta.recharge.path": { "$regex": `.*${id}$` , "$exists": true },
      });
      query["$or"].push({
        "meta.recharge.charge_id": { "$eq": id, "$exists": true },
      });
    };
    if (allHooks.includes("upcoming")) { // in this case we don't have a shopify_order_id
      query["$or"].push({
        "meta.shopify.path": { "$exists": true },
      });
    };
    for (const id of shopify_order_ids) {
      query["$or"].push({
        "meta.shopify.path": { "$regex": `.*${id}$` , "$exists": true },
      });
    };
    const result = await _mongodb.collection("logs").find(query).sort({timestamp: 1}).toArray();
    console.log("==================================================");
    for (const log of res) {
      console.log(log);
    };
    console.log(allHooks);
    console.log(result.length);

    console.log(collectFiles);

    // put together json depiction:
    // list the files and group by type
    const fileListing = { recharge : [], shopify: [] };
    for (const f of collectFiles) {
      const parts = f.split(".");
      const fileDate = getDate(f);
      const subparts = parts[1].split("-")
      const key = subparts[0];
      const partner = parts[0];
      const webhook = subparts[1];
      const day = subparts.slice(2, 5).join("/");
      const milliseconds = parts[2].split("-")[0];
      const objId = parts[2].split("-")[1];
      const time = `${subparts[5]}.${milliseconds}`;
      fileListing[partner].push({
        key, objId, webhook, day, time, filename: f, fileDate
      });
    };
    console.log(fileListing);

    // get time delta between 1st and last log
    const firstLog = new Date(result[0].timestamp)
    console.log(firstLog.toISOString());
    const lastLog = new Date(result[result.length - 1].timestamp);
    console.log(lastLog.toISOString());

    console.log((lastLog - firstLog)/1000);

    const finalListing = {
      timedelta: (lastLog - firstLog)/1000,
      files: fileListing,
    };
    console.log(finalListing);

    // now save the files into a directory
    let report = "reports"; // catch all, up to me to move it into docs
    /*
    if (allHooks.includes("upcoming")) report = "upcoming";
    if (allHooks.includes("processed")) report = "processed";
    */

    const reportFolder= new URL(`./${report}/`, import.meta.url);
    console.log(reportFolder.pathname);
    try {
      await fs.mkdir(reportFolder);
    } catch (err) {
      // file exists
    };
    // remove all existing files in that folder
    try {
      await fs.access(reportFolder);
      console.log("can access");
      try {
        await fs.writeFile(path.join(reportFolder.pathname, "log.json"), 
          JSON.stringify(result, null, 2).replaceAll("cousinsd@proton", "jon.doe@mail"), { 
          encoding: "utf8", 
          flag: "w", 
          mode: 0o666 
        });
        await fs.writeFile(path.join(reportFolder.pathname, "report.json"), 
          JSON.stringify(finalListing, null, 2), { 
          encoding: "utf8", 
          flag: "w", 
          mode: 0o666 
        });
        for (const f of collectFiles) {
          await fs.readFile(path.join(folder, f))
            .then(async content => {
              const newContent = content.toString()
                .replaceAll("cousinsd@proton", "jon.doe@mail")
                .replaceAll("Darryl", "Jon").replaceAll("Cousins", "Doe")
                .replaceAll("Taumutu", "Aroha").replaceAll("275247293", "273333333");
              await fs.writeFile(path.join(reportFolder.pathname, f), 
                newContent, { 
                encoding: "utf8", 
                flag: "w", 
                mode: 0o666 
              });
            });
        };
      } catch(err) {
        console.error(err);
      };
    } catch (err) {
      console.error(err);
    };

    console.log("");
  } catch(e) {
    console.error(e);
  } finally {
    process.emit('SIGINT'); // will close mongo connection
  };
};

const main = async () => {
  await run();
  process.emit('SIGINT'); // will close mongo connection
};

main().catch(console.error);
