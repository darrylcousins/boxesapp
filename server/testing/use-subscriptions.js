import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { MongoClient, ObjectId } from "mongodb";
import { Shopify } from "../src/lib/shopify/index.js";
import { getMongo, getMongoConnection } from "../src/lib/mongo/mongo.js";
import { winstonLogger } from "../config/winston.js";

import { makeRechargeQuery } from "../src/lib/recharge/helpers.js";
import { makeShopQuery } from "../src/lib/shopify/helpers.js";
import { gatherVerifiedData } from "../src/lib/recharge/verify-customer-subscriptions.js";
import { reconcileGetGroups, reconcileGetGrouped, gatherData } from "../src/lib/recharge/reconcile-charge-group.js";
import getLastOrder from "../src/lib/recharge/get-last-order.js";

const getLogger = () => {
  if (typeof _logger === "undefined") {
    return winstonLogger;
  } else {
    return _logger;
  };
};

global._filename = (_meta) => _meta.url.split("/").pop();
dotenv.config({ path: path.resolve(_filename(import.meta), '../.env') });
global._logger = console;
global._mongodb;
_logger.notice = (e) => console.log(e);

        /*
        groups
          .find(el => el.address_id === subscription.address_id).subscriptions
          .find(el => el.scheduled_at === subscription.next_charge_scheduled_at).line_items
          .push({
            purchase_item_id: subscription.id,
            external_product_id: subscription.external_product_id,
            external_variant_id: subscription.external_variant_id,
            properties: subscription.properties,
            quantity: subscription.quantity,
            title: subscription.product_title,
            variant_title: subscription.variant_title,
            unit_price: parseFloat(subscription.price).toFixed(2),
            total_price: parseFloat(subscription.price * subscription.quantity).toFixed(2),
          });
          */
/**
 * An attempt to build fake charge from subscriptions
 */

const run = async () => {

  // this one closes the connection on SIGINT
  global._mongodb = await getMongoConnection(); // if mongo connection required

  await Shopify.initialize(); // if shopify query required


  try {

    const io = null;
    const session_id = null;

    const action = null;
    const address_id = null;
    const customer_id = 91048167;
    //const address_id = 152567428;
    const status = action === "cancelled" ? "cancelled" : "active";
    const query = [];
    query.push(["customer_id", customer_id]);
    query.push(["status", status]);
    query.push(["limit", 50]);
    if (address_id) query.push(["address_id", address_id]);
    const { subscriptions } = await makeRechargeQuery({
        path: `subscriptions`,
        title: `Get subscriptions ${ customer_id }`,
        query,
        io,
        session_id
      });
    const { customer } = await makeRechargeQuery({
      path: `customers/${customer_id}`,
      title: `Get customer ${ customer_id }`,
      io,
      session_id
    });

    // group first by address_id, and then by next_charge_scheduled_at
    const groups = [];
    const price_table = [];
    for (const subscription of subscriptions) {
      if (!groups.some(el => Object.hasOwn(el, "address_id") && el.address_id === subscription.address_id)) {
        const { address } = await makeRechargeQuery({
          path: `addresses/${subscription.address_id}`,
          title: `Get address ${ subscription.address_id }`,
          // io,
          // session_id
        });
        groups.push({
          address,
          customer,
          address_id: subscription.address_id,
          customer_id: subscription.customer_id,
          subscriptions: [] });
      };
      if (!groups
        .find(el => el.address_id === subscription.address_id).subscriptions
        .some(el => Object.hasOwn(el, "scheduled_at") && el.scheduled_at === subscription.next_charge_scheduled_at)
      ) {
        groups
          .find(el => el.address_id === subscription.address_id).subscriptions
          .push({ scheduled_at: subscription.next_charge_scheduled_at, line_items: [] });
      };
      if (subscription.properties.some(el => el.name === "Including")) {
        if (!price_table.some(el => el.variant_id.toString() === subscription.external_variant_id.ecommerce)) {
          try {
            // need to get the actual price of box
            const { variant } = await makeShopQuery({
              path: `variants/${subscription.external_variant_id.ecommerce}.json`,
              fields: ["price"],
              title: `Get store price for ${subscription.product_title}`,
              io,
            });
            price_table.push({ variant_id: subscription.external_variant_id.ecommerce, price: variant.price });
          } catch(err) {
            _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
          };
        };
        // getLastOrder - setting this on subscription instead of charge - needs picking up
        const orderQuery = {
          customer_id: customer_id,
          product_id: parseInt(subscription.external_product_id.ecommerce),
          subscription_id: subscription.id,
        };
        subscription.lastOrder = await getLastOrder(orderQuery, io);
      };
      subscription.purchase_item_id = subscription.id; // historic from previously only using charge line_items
      subscription.title = subscription.product_title;
      groups
        .find(el => el.address_id === subscription.address_id).subscriptions
        .find(el => el.scheduled_at === subscription.next_charge_scheduled_at).line_items
        .push(subscription);
    };

    const charges = [];
    for (const { address, address_id, customer, customer_id, subscriptions } of groups) {
      for (const { scheduled_at, line_items } of subscriptions) {
        charges.push({
          id: null,
          address_id,
          scheduled_at,
          shipping_address: address,
          customer,
          line_items,
        });
      };
    };
    const { data, errors } = await gatherVerifiedData({ charges, customer, price_table, io });
    console.log(data);
    console.log(errors);

  } catch(e) {
    console.error(e);
    process.emit('SIGINT'); // will close mongo connection
  } finally {
    //dbClient.close();
    process.emit('SIGINT'); // will close mongo connection
  };
};

const main = async () => {
  await run();
  process.emit('SIGINT'); // will close mongo connection
};

main().catch(console.error);





