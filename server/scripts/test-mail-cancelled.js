const includes = [
{
"title": "The Medium Vege Box",
"shopify_product_id": 7517242917014,
"subscription_id": 390248122,
"quantity": 1,
"properties": [
{
"name": "Delivery Date",
"value": "Tue Aug 08 2023"
},
{
"name": "Including",
"value": "Baby (Roast) Vege Mix,Cabbage Green,Chard Red,Coriander Bunch,Daikon Radish ea,Onions Brown 4x,Potato Agria 1kg"
},
{
"name": "Add on Items",
"value": "Apple Braeburn 1kg,Beetroot 1kg"
},
{
"name": "Swapped Items",
"value": null
},
{
"name": "Removed Items",
"value": null
},
{
"name": "box_subscription_id",
"value": "390248122"
}
],
"price": "35.00",
"total_price": "35.00"
},
{
"title": "Apple Braeburn 1kg",
"shopify_product_id": 6166841393302,
"subscription_id": 390779849,
"quantity": 1,
"properties": [
{
"name": "Delivery Date",
"value": "Tue Aug 08 2023"
},
{
"name": "Add on product to",
"value": "The Medium Vege Box"
},
{
"name": "box_subscription_id",
"value": "390248122"
}
],
"price": "4.50",
"total_price": "4.50"
},
{
"title": "Beetroot 1kg",
"shopify_product_id": 6621185769622,
"subscription_id": 390779855,
"quantity": 1,
"properties": [
{
"name": "Delivery Date",
"value": "Tue Aug 08 2023"
},
{
"name": "Add on product to",
"value": "The Medium Vege Box"
},
{
"name": "box_subscription_id",
"value": "390248122"
}
],
"price": "5.00",
"total_price": "5.00"
}
];

const attributes = {
"nextChargeDate": "Sat Aug 05 2023",
"nextDeliveryDate": "Tue Aug 08 2023",
"hasNextBox": true,
"title": "The Medium Vege Box",
"variant": "Tuesday",
"pending": false,
"frequency": "Delivery every 1 week",
"days": 7,
"scheduled_at": "2023-08-05",
"subscription_id": 390248122,
"templateSubscription": {
"address_id": 127883610,
"charge_interval_frequency": 1,
"expire_after_specific_number_of_charges": null,
"next_charge_scheduled_at": "2023-08-05",
"order_day_of_month": null,
"order_day_of_week": 5,
"order_interval_frequency": 1,
"order_interval_unit": "week"
},
"rc_subscription_ids": [
{
"shopify_product_id": 7517242917014,
"subscription_id": 390248122,
"quantity": 1,
"title": "The Medium Vege Box",
"price": 3500
}
],
"charge_id": 871786897,
"address_id": 127883610,
"customer": {
"id": 84185810,
"email": "cousinsd@proton.me",
"external_customer_id": {
"ecommerce": "3895947395222"
},
"hash": "78927a76eb2779c61bbc178edffd72"
},
"lastOrder": {
"current_total_price": "35.00",
"order_number": 1349,
"line_items": [
{
"name": "The Medium Vege Box - Tuesday",
"properties": [
{
"name": "Delivery Date",
"value": "Tue Aug 01 2023"
},
{
"name": "Including",
"value": "Baby (Roast) Vege Mix,Cabbage Green,Chard Red,Coriander Bunch,Daikon Radish ea,Onions Brown 4x,Potato Agria 1kg"
},
{
"name": "Removed Items",
"value": ""
},
{
"name": "Swapped Items",
"value": ""
},
{
"name": "Add on Items",
"value": ""
}
],
"price": "35.00",
"product_id": 7517242917014
}
],
"delivered": " Tue Aug 01 2023"
},
"totalPrice": "35.00",
"notIncludedInThisBox": [],
"newIncludedInThisBox": [],
"nowAvailableAsAddOns": [
"Beetroot 1kg",
"Curly Kale",
"Yams 500g"
]
};

import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { MongoClient, ObjectID } from "mongodb";
import { getMongoConnection, MongoStore } from "../src/lib/mongo/mongo.js";
import { gatherData, reconcileGetGrouped } from "../src/lib/recharge/reconcile-charge-group.js";

global._filename = (_meta) => _meta.url.split("/").pop();
dotenv.config({ path: path.resolve(_filename(import.meta), '../.env') });
global._logger = console;
global._mongodb;
_logger.notice = (e) => console.log(e);

import mail from "../src/mail/subscription-action.js";

const run = async () => {
  global._mongodb = await getMongoConnection();
  try {
    await mail({ descriptiveType: "somewhat cancelled", type: "cancelled", includes, attributes });

  } catch(e) {
    console.error(e);
  } finally {
    // hold this open if you need to see api calls and webhooks happen
    //process.emit('SIGINT'); // should close mongo connection
  };
};

const main = async () => {
  await run();
};

main().catch(console.error);
