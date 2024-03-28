/**
 * Build a query to recharge
 *
 * Run the script using `node recharge-query.js`
 *
 * @author Darryl Cousins <darryljcousins@gmail.com>
 * @module recharge-query
 */
import path from "path";
import dotenv from "dotenv";    
import { MongoClient, ObjectID } from "mongodb";
import { getMongoConnection, MongoStore } from "../src/lib/mongo/mongo.js";
import { makeShopQuery } from "../src/lib/shopify/helpers.js";
import { Shopify } from "../src/lib/shopify/index.js";

global._filename = (_meta) => _meta.url.split("/").pop();
dotenv.config({ path: path.resolve(_filename(import.meta), '../.env') });
global._logger = console;
global._mongodb;
_logger.notice = (e) => console.log(e);

import { makeRechargeQuery } from "../src/lib/recharge/helpers.js";

const run = async () => {
  try {

    global._mongodb = await getMongoConnection(); // if mongo connection required
    await Shopify.initialize(); // if shopify query required
    const customer_id = 6357087092886;
    // 1. get customer from shopify for the address
    const uri = `customers/${customer_id}.json`;

    const fields = [];
    const { customer } = await makeShopQuery({path: uri})
    //console.log(customer);

    // customer body
    const customer_body = {
      email: customer.email,
      first_name: customer.first_name,
      last_name: customer.last_name,
      external_customer_id: {
        ecommerce: customer.id.toString()
      },
    };
    const address_body = {
      address1: customer.default_address.address1,
      address2: customer.default_address.address2,
      city: customer.default_address.city,
      company: customer.default_address.company,
      country_code: customer.default_address.country_code,
      province: customer.default_address.province,
      phone: customer.default_address.phone,
      zip: customer.default_address.zip,
      first_name: customer.first_name,
      last_name: customer.last_name,
    };
    const result = await makeRechargeQuery({
      method: "POST",
      path: `customers`,
      body: JSON.stringify(customer_body),
    }).then(async (res) => {
      console.log(res);
      if (!res.customer) return false;
      address_body.customer_id = res.customer.id;
      return await makeRechargeQuery({
        method: "POST",
        path: `addresses`,
        body: JSON.stringify(address_body),
      });
    });
    console.log(result);

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




