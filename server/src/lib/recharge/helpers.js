/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import "dotenv/config";
import { makeShopQuery } from "../shopify/helpers.js";
import { getNZDeliveryDay } from "../dates.js";

/*
 * Construct and execute a query to recharge, used to get objects or post upates
 *
 * @function makeRechargeQuery
 */
export const makeRechargeQuery = async ({method, path, limit, query, body}) => {
  const http_method = method ? method : 'GET';
  const start = "?";
  const searchString = query ? start + query.reduce((acc, curr, idx) => {
    const [key, value] = curr;
    return acc + `${ idx > 0 ? "&" : ""}${key}=${value}`;
  }, "") : "";
  const count = limit ? `&limit=${limit}` : "";
  
  const url = `${process.env.RECHARGE_URL}/${path}${searchString}${count}`;

   _logger.info(`Query recharge: ${http_method} ${url}`);
  return await fetch(encodeURI(url), {
    method: http_method,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-RECHARGE-VERSION': process.env.RECHARGE_VERSION, 
      'X-RECHARGE-ACCESS-TOKEN': process.env.RECHARGE_ACCESS_TOKEN, 
    },
    body,
  })
    .then(response => {
      if (http_method === "DELETE") {
        return response;
      } else {
        return response.json();
      };
    });
};

/*
 * @function updateSubscriptions
 * @param { updates }
 * @return { includes } // new subscriptions created
 */
export const updateSubscriptions = async ({ updates }) => {

  const includes = [];
  for (const update of updates) {
    delete update.shopify_product_id;
    const options = {};
    if (Object.hasOwnProperty.call(update, "subscription_id")) {
      options.path = `subscriptions/${update.subscription_id}`;
      if (update.quantity === 0) {
        options.method = "DELETE";
        console.log("Deleting", update.title, update.subscription_id);
      } else {
        options.method = "PUT";
        const body = {
          properties: update.properties,
          quantity: update.quantity,
        };
        if (Object.hasOwnProperty.call(update, "price")) body.price = update.price;
        options.body = JSON.stringify(body);
      };
    } else {
      options.path = "subscriptions";
      options.method = "POST";
      options.body = JSON.stringify(update);
    };

    const result = await makeRechargeQuery(options);
    if (options.method === "POST") {
      const { subscription } = result;
      includes.push({
        title: subscription.product_title,
        shopify_product_id: parseInt(subscription.external_product_id.ecommerce),
        subscription_id: subscription.id,
        quantity: subscription.quantity,
        properties: subscription.properties,
      });
    };
    if (options.method === "DELETE") {
      //console.log(result);
    };
  };
  return { includes };
};

/*
 * @function getLastOrder
 * @returns { order }
 */
export const getLastOrder = async ({ customer_id, address_id, subscription_id, product_id }) => {
  const { charges } = await makeRechargeQuery({
    path: `charges`,
    query: [
      ["customer_id", customer_id ],
      ["purchase_item_id", subscription_id ],
      ["status", "success" ],
      ["limit", 1 ],
    ]
  });
  const charge = (charges.length) ? charges[0] : null;
  if (charge) {
    const { order } = await makeShopQuery({
      path: `orders/${charge.external_order_id.ecommerce}.json`,
      fields: ["current_total_price", "order_number", "tags", "line_items"]
    });
    if (!order) return null;
    order.delivered = order.tags;
    delete order.tags;
    order.line_items = order.line_items
      .filter(el => el.product_id === product_id)
      .map(el => {
      return {
        name: el.name,
        properties: el.properties,
        price: el.price,
        product_id: el.product_id
      };
    });
    return order;
  };
  return null;
};
