/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import "dotenv/config";

import { Shopify } from "./index.js";
/**
  * Helpers for shopify interactions
  *
 */

export const makeShopQuery = async ({path, limit, query, fields}) => {
  const fieldString = fields ? `?fields=${fields.join(',')}` : "";
  const start = fields ? "&" : "?";
  const searchString = query ? start + query.reduce((acc, curr, idx) => {
    const [key, value] = curr;
    return acc + `${ idx > 0 ? "&" : ""}${key}=${value}`;
  }, "") : "";
  const count = limit ? `&limit=${limit}` : "";
  
  const url = `https://${process.env.SHOP_NAME}.myshopify.com/admin/api/${process.env.SHOPIFY_API_VERSION}/${path}${fieldString}${searchString}${count}`;
  _logger.info(`${_filename(import.meta)} Query store: ${url}`);
  return await fetch(encodeURI(url), {
    method: 'GET',
    headers: {
      'X-Shopify-Access-Token': Shopify.Context.ACCESS_TOKEN 
    }
  })
    .then(response => response.json())
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

  return await makeShopQuery({path, limit, query, fields})
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
      //_logger.info(`${_filename(import.meta)} Updated store ${objName} with id ${id} with data ${JSON.stringify(data, null, 2)}`);
      return response.status;
    });
};


