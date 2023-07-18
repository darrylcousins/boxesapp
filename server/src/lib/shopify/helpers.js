/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import "dotenv/config";

import { Shopify } from "./index.js";
import { makeApiJob } from "../../bull/job.js";
import { winstonLogger } from "../../../config/winston.js"
import { getMongo } from "../mongo/mongo.js";
/**
  * Helpers for shopify interactions
  *
 */

export const makeShopQuery = async (opts) => {
  opts.processorName = "makeShopQuery";
  return await makeApiJob(opts);
};

export const doShopQuery = async (opts) => {
  const { path, limit, query, fields, title } = opts;
  const fieldString = fields ? `?fields=${fields.join(',')}` : "";
  const start = fields ? "&" : "?";
  const searchString = query ? start + query.reduce((acc, curr, idx) => {
    const [key, value] = curr;
    return acc + `${ idx > 0 ? "&" : ""}${key}=${value}`;
  }, "") : "";
  const count = limit ? `&limit=${limit}` : "";
  
  const url = `https://${process.env.SHOP_NAME}.myshopify.com/admin/api/${process.env.SHOPIFY_API_VERSION}/${path}${fieldString}${searchString}${count}`;
  const http_method = "GET";
  //
  // if this is a new connection then we need to close it too this is because
  // we also run in a separate worker process so do not have the persistent
  // global._mongodb variable
  const { mongo, client } = await getMongo();
  const session = await mongo.collection("shopify_sessions").findOne({shop: process.env.SHOP});
  if (Boolean(client)) {
    await client.close();
  };

  return await fetch(encodeURI(url), {
    method: http_method,
    headers: {
      //"X-Shopify-Access-Token": Shopify.Context.ACCESS_TOKEN 
      "X-Shopify-Access-Token": session.access_token  // can I guarantee the presence?
    }
  }).then(async (response) => {
    // I don't recall if they come in "errors" or "error"
    // XXX Fix me when you remember - same too for recharge api query
    const json = await response.json();
    if (Object.hasOwnProperty.call(json, "errors")) {
      const meta = {
        shopify: {
          uri: url,
          method: "GET",
          errors: json.errors,
        },
      };
      winstonLogger.error(`Shopify fetch errors.`, { meta });
    };
    json.status = response.status;
    json.statusText = response.statusText;
    json.title = title || "shopify no title";
    json.method = http_method;

    if (parseInt(response.status) > 299) {
      throw new Error(`Recharge request failed with code ${response.status}: "${response.statusText}"`);
    };

    return json;
  })
};

/*
 * function queryStoreProducts
 * helper method for queryStoreProducts and queryStoreBoxes
 * expects a string to search on and product_type to filter by
 */
export const queryStoreProducts = async function (search, product_type) {

  const path = "products.json";
  const fields = ["id", "title", "tags"];
  const limit = 250; // need to sort out paging, perhaps using 'since_id', not so successful, just relying on search terms
  const query = [
    ["product_type", product_type],
    ["status", "active"],
  ];

  return await makeShopQuery({path, limit, query, fields, title: "Search products"})
    .then(async ({products}) => {
      const regexp = new RegExp(search, 'i');
      const filtered = products.filter(({title}) => regexp.test(title));
      return filtered;
    });
};

/*
 * function updateStoreObject
 * update an attribute of a store object
 * only used? now to update tags
 */
export const updateStoreObject = async (id, objName, data) => {
  const url = `https://${process.env.SHOP_NAME}.myshopify.com/admin/api/${process.env.SHOPIFY_API_VERSION}/${objName}s/${id}.json`;
  const body = {};
  body[objName] = data;
  
  return await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': Shopify.Context.ACCESS_TOKEN 
    },
    body: JSON.stringify(body),
  })
    .then(response => {
      //winstonLogger.info(`${_filename(import.meta)} Updated store ${objName} with id ${id} with data ${JSON.stringify(data, null, 2)}`);
      return response.status;
    });
};

/*
 * function queryShopGraphQL
 * body shall be a graphql query string
 */
export const queryStoreGraphQL = async ({ body }) => {
  const url = `https://${process.env.SHOP_NAME}.myshopify.com/admin/api/${process.env.SHOPIFY_API_VERSION}/graphql.json`;
  
  return await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/graphql',
      'X-Shopify-Access-Token': Shopify.Context.ACCESS_TOKEN 
    },
    body,
  }).then(response => {
    // I don't recall if they come in "errors" or "error"
    // XXX Fix me when you remember - same too for recharge api query
    const json = response.json();
    if (Object.hasOwnProperty.call(json, "errors")) {
      const meta = {
        shopify: {
          uri: "graphql.json",
          method: "POST",
          errors: json.errors,
        },
      };
      winstonLogger.notice(`Shopify graphql errors.`, { meta });
    };
    if (Object.hasOwnProperty.call(json, "error")) {
      const meta = {
        shopify: {
          uri: "graphql.json",
          method: "POST",
          errors: json.errors,
        },
      };
      winstonLogger.notice(`Shopify graphql error.`, { meta });
    };
    return json;
  })
};


