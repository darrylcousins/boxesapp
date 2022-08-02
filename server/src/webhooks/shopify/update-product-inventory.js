/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import "isomorphic-fetch";
import PromiseThrottle from "promise-throttle";
import "dotenv/config";
import { Shopify } from "../../lib/shopify/index.js";

// XXX consider using src/helpers/shopify:makeShopifyQuery ?
const storeUrl = `https://${process.env.SHOP_NAME}.myshopify.com/admin/api/${process.env.SHOPIFY_API_VERSION}/`;

export default async function updateProductInventory(order) {

  // get from req when running from webhook, or pass to this method
  const collection = _mongodb.collection("boxes");

  // for subscriptions the products will not be included in the order
  //console.log(order);

  // XXX missing counts here for subscriptions which do not include the extras as extra items

  // collect list of products included in this order from the box
  const pipeline = [
    { $match: { shopify_product_id: { $eq: order.product_id }, delivered: { $eq: order.delivered } } },
    { $unwind: "$includedProducts" },
    { $project: {
      shopify_product_id: "$includedProducts.shopify_product_id",
      shopify_variant_id: "$includedProducts.shopify_variant_id",
      shopify_title: "$includedProducts.shopify_title",
    }},
    { $match: { shopify_title: { $nin: order.removed } } },
  ];

  try {
    const products = await collection.aggregate(pipeline).toArray();
    const promiseThrottle = new PromiseThrottle({
      requestsPerSecond: 4,
      promiseImplementation: Promise
    });
    const shopQueries = [];

    let count = 1; // get counts if this is a subscription
    for (const product of products) {
      shopQueries.push(promiseThrottle.add(
        updateProductInventoryLevel.bind(this, product, count)
      ));
    };

    try {
      Promise.all(shopQueries); // all should return true, and logged
    } catch(err) {
      throw err;
    };

  } catch(err) {
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };

};

const getInventoryItemId = async (product) => {
  const url = `${storeUrl}products/${product.shopify_product_id}/variants/${product.shopify_variant_id}.json`;
  
  return await fetch(url, {
    method: 'GET',
    headers: {
      'X-Shopify-Access-Token': Shopify.Context.ACCESS_TOKEN 
    },
  })
    .then(response => response.json())
    .then(json => {
      if (json.variant && json.variant.inventory_item_id) {
        return json.variant.inventory_item_id;
      } else {
        const meta = {
          product: {
            shopify_product_id: product.shopify_product_id,
            name: product.shopify_title,
            file: _filename(import.meta),
          }
        };
        _logger.notice(`Update inventory, failed to get inventory_item_id`, { meta });
        return null;
      }
    });
};

const getInventoryLocation = async (inventory_item_id) => {
  const url = `${storeUrl}inventory_levels.json?inventory_item_ids=${inventory_item_id}`;
  
  return await fetch(url, {
    method: 'GET',
    headers: {
      'X-Shopify-Access-Token': Shopify.Context.ACCESS_TOKEN 
    },
  })
    .then(response => response.json())
    .then(json => {
      if (Object.hasOwnProperty.call(json, 'inventory_levels')) {
        return json.inventory_levels[0];
      } else {
        return null;
      };
    });
};

const updateInventoryLevel = async (data) => {
  const url = `${storeUrl}inventory_levels/adjust.json`;
  
  return await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': Shopify.Context.ACCESS_TOKEN 
    },
    body: JSON.stringify(data),
  })
    .then(response => response.json())
    .then(json => {
      if (json.inventory_level && json.inventory_level.available) {
        return json.inventory_level.available;
      } else {
        return null;
      };
    });
};

const updateProductInventoryLevel = async (product, count) => {
  const inventory_item_id = await getInventoryItemId(product);
  const meta = {
    product: {
      shopify_product_id: product.shopify_product_id,
      name: product.shopify_title,
      file: _filename(import.meta)
    }
  };
  if (!inventory_item_id) {
    _logger.notice(`Update inventory, failed to get inventory_item_id`, { meta });
    return false;
  };
  const location = await getInventoryLocation(inventory_item_id);
  if (location) {
    if (location.available === null) {
      _logger.notice(`Update inventory, inventory level not tracked`, { meta });
    } else {
      const data = {
        location_id: location.location_id,
        inventory_item_id,
        available_adjustment: (count * -1),
      };
      const adjusted = await updateInventoryLevel(data);
      //_logger.notice(`Inventory level changed from ${location.available} to ${adjusted}`, { meta });
    };
  } else {
    _logger.notice(`Update inventory, inventory location not found`, { meta });
  };
  return true;
};

