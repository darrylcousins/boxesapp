import fs from "fs/promises";
import path from "path";

const setCharAt = (str,index,chr) => {
  if(index > str.length-1) return str;
  return str.substring(0,index) + chr + str.substring(index+1);
};

const getDate = (f, fileType) => {
  let day, split, time;
  if (fileType === "json") {
    split = f.split("-");
    day = split.slice(2, 5).join("-");
    time = split[5];
    return new Date(Date.parse(`${day}T${time}Z`));
  } else {
    const dotSplit = f.split(".");
    day = dotSplit[3];
    time = dotSplit[4]; // milliseconds
    day = setCharAt(day, 10, "T");
    return new Date(Date.parse(`${day}.${time}Z`));
  };
};

const sort = (a, b) => {
  const fileTypeA = a.split(".")[a.split(".").length - 1];
  const fileTypeB = b.split(".")[b.split(".").length - 1];
  const timeA = getDate(a, fileTypeA).getTime();
  const timeB = getDate(b, fileTypeB).getTime();
  if (timeA < timeB) return 1;
  if (timeA > timeB) return -1;
  return 0;
};

const makeString = (d) => d.toISOString().replace("T", "-").replace("Z", "");

const customer_email = "cousinsd@proton.me"; // used to find files
const customer_id = 84185810; // used to find files

//const customer_email = "veggies@streamsideorganics.co.nz"; // used to find files
//const customer_id = 117434158; // used to find files
/*
 * @function buildReport
 * @params {string} webhookFolder Path to source folder of saved json webhook body files
 * @result {string} dateString ISO datetime string
 * @result {integer} deltaMinutes How many minutes to back up from dateString
 * @result {string} type "user" or "webhook" or "broken" - filter logs more for user
 */
export default async ({ webhookFolder, mailFolder, dateString, deltaMinutes, type }) => {
  // Step one: collect files from debug at a timestamp delta - utc time
  let folder = webhookFolder;

  const d = new Date(Date.parse(dateString));
  d.setMinutes(d.getMinutes() - deltaMinutes);
  // NOTE going deltaMinutes back

  const startTime = new Date(d);
  let start = makeString(startTime);

  d.setMinutes(d.getMinutes() + deltaMinutes);
  const endTime = new Date(d);
  let end = makeString(endTime);

  // list files in debug, sort by timestamp and filter somehow
  const files = [];
  const mail = [];
  const allHooks = [];

  let recharge_subscription_ids = [];
  let recharge_charge_ids = [];
  let recharge_order_ids = [];
  let shopify_order_ids = [];
  let next_charge_scheduled_at = []; // should only be one of these
  const regexEmail = new RegExp(`${customer_email}`); // email is common between shopify and recharge
  const regexCustomer = new RegExp(`${customer_id}`); // email is common between shopify and recharge

  try {
    await fs.readdir(folder)
      .then(async readFiles => {
        for (const f of readFiles.sort(sort)) {
          const dotSplit = f.split(".");
          const fileType = dotSplit[dotSplit.length - 1];
          const fileDate = getDate(f, fileType);
          if (startTime.getTime() < fileDate.getTime() &&  fileDate.getTime() < endTime.getTime()) {
            await fs.readFile(path.join(folder, f))
              .then(content => {
                if (fileType === "json") {
                  if (regexEmail.test(content) || regexCustomer.test(content) || f.includes("async_batches")) {

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

                    files.push(f);
                    allHooks.push(webhook);

                    if (partner === "shopify") {
                      if (key === "order") shopify_order_ids.push(obj.id);
                    };
                    if (partner === "recharge") {
                      if (Object.hasOwn(obj, "external_order_id")) {
                        shopify_order_ids.push(obj.external_order_id.ecommerce);
                      };
                      if (key === "order") {
                        recharge_order_ids.push(obj.id);
                        recharge_charge_ids.push(obj.charge.id);
                      };
                      if (key === "subscription") {
                        recharge_subscription_ids.push(obj.id);
                        next_charge_scheduled_at.push(obj.next_charge_scheduled_at);
                      };
                      if (key === "charge") recharge_charge_ids.push(obj.id);
                      if (Object.hasOwn(obj, "line_items")) {
                        for (const item of obj.line_items) {
                          if (item.properties.some(el => el.name === "box_subscription_id")) {
                            recharge_subscription_ids.push(item.purchase_item_id);
                          };
                        };
                      };
                    };
                  };
                } else if (parseInt(dotSplit[2]) === customer_id) { // mail file
                  mail.push(f);
                };
              });
          };
        };
      });
    recharge_subscription_ids = Array.from(new Set(recharge_subscription_ids));
    recharge_charge_ids = Array.from(new Set(recharge_charge_ids));
    recharge_order_ids = Array.from(new Set(recharge_order_ids));
    next_charge_scheduled_at = Array.from(new Set(next_charge_scheduled_at));
    shopify_order_ids = shopify_order_ids.map(el => parseInt(el)).filter(el => el);
    shopify_order_ids = Array.from(new Set(shopify_order_ids));
 
    // Step two: collect mongo logs at a timestamp delta - utc time

    // query should include our customer_id meta.recharge.customer_id
    // query should include path/subscription_id meta.recharge.path
    // query should include path/charge_id ?? meta.recharge.path
    // query should include charges with query meta.recharage.query includes curstomer_id
    // query should include subscriptions with query subscription_ids
    // query should include the shopify api call Get Order - ecommerve id in path orders/id.json

    const query = {};

    query.timestamp = {"$gte": startTime, "$lt": endTime };

    let user_and;
    const nin = [
      /^Charge/,
      /^Get Charge/,
      /^Get charge/,
      //  /^Get customer/,
      /^Get order/,
      /^Get last order/,
      /^Get store price/,
      /^Collecting subscription/,
      ///^Get order/,
    ];
    if (type === "user") {
      user_and = {"meta.recharge.title": { "$nin": nin }};
    };
    const webhook_or = [];
    webhook_or.push({
      "meta.recharge.customer_id": { "$eq": customer_id, "$exists": true },
    });
    webhook_or.push({
      "meta.order.customer_id": { "$eq": customer_id, "$exists": true },
    });
    webhook_or.push({
      "meta.recharge.query.customer_id": { "$eq": customer_id, "$exists": true },
    });
    webhook_or.push({
      "meta.recharge.path": { "$regex": `^asycn_batches` , "$exists": true },
    });
    for (const id of recharge_subscription_ids) {
      webhook_or.push({
        "meta.recharge.path": { "$regex": `.*${id}$` , "$exists": true },
      });
      webhook_or.push({
        "$and": [
          { "meta.recharge.query.ids": { "$exists": true } },
          { "meta.recharge.query.ids": { "$elemMatch": { "$eq": id.toString() } } },
        ],
      });
    };
    // a catch all for creating subscriptions
    // if catching unwanted then try "meta.recharge.body.next_charge_scheduled_at
    /*
    webhook_or.push({
      "meta.recharge.method": { "$eq": "POST", "$exists": true },
    });
    */
    for (const d of next_charge_scheduled_at) {
      webhook_or.push({
        "meta.recharge.body.next_charge_scheduled_at": { "$eq": d , "$exists": true },
      });
    };
    for (const id of recharge_charge_ids) {
      webhook_or.push({
        "meta.recharge.path": { "$regex": `.*${id}$` , "$exists": true },
      });
      webhook_or.push({
        "meta.recharge.charge_id": { "$eq": id, "$exists": true },
      });
    };
    if (allHooks.includes("upcoming")) { // in this case we don't have a shopify_order_id
      webhook_or.push({
        "meta.shopify.path": { "$exists": true },
      });
    };
    for (const id of shopify_order_ids) {
      webhook_or.push({
        "meta.shopify.path": { "$regex": `.*${id}$` , "$exists": true },
      });
      webhook_or.push({
        "meta.shopify.order_id": { "$eq": id , "$exists": true },
      });
    };

    if (type !== "broken") { // simply get everything if it is broken so we can try to figure it out
      if (user_and) {
        query["$and"] = [
          { "$or" : webhook_or },
          user_and,
        ];
      } else {
        query["$or"] = webhook_or;
      };
    };
    const logs = await _mongodb.collection("logs").find(query).sort({timestamp: -1}).toArray();

    // put together json depiction:
    // list the files and group by type
    const fileListing = [];
    for (const f of files) {
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
      fileListing.push({
        partner, key, objId, webhook, day, time, filename: f, fileDate
      });
    };

    console.log(files);
    console.log(mail);
    let firstLog;
    let lastLog;
    let report = null;
    if (logs.length > 0) {
      // get time delta between 1st and last log
      firstLog = new Date(logs[0].timestamp)
      lastLog = new Date(logs[logs.length - 1].timestamp);
      report = {
        timedelta: (firstLog - lastLog)/1000,
        files: fileListing,
      };
    };
    return { report, logs, files, mail };

  } catch(err) {
    throw err;
  };
};
