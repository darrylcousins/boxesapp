/*
 * @module lib/recharge/get-last-order.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { makeShopQuery } from "../shopify/helpers.js";
import { makeRechargeQuery } from "./helpers.js";

/*
 * @function getLastOrder
 * @returns { order }
 */
export default async ({ customer_id, address_id, subscription_id, product_id, io }) => {
  const { charges } = await makeRechargeQuery({
    path: `charges`,
    query: [
      ["customer_id", customer_id ],
      ["address_id", address_id ],
      ["purchase_item_id", subscription_id ],
      ["status", "success" ],
      ["limit", 1 ],
    ],
    title: "Get last order",
    io,
  });
  const charge = (charges.length) ? charges[0] : null;
  if (charge) {
    const { order } = await makeShopQuery({
      path: `orders/${charge.external_order_id.ecommerce}.json`,
      fields: ["current_total_price", "order_number", "tags", "line_items"],
      title: "Get order",
      io,
    });
    if (!order) return {};
    order.delivered = null;
    for (const tag of order.tags.split(",")) {
      const parsed = Date.parse(tag.trim()); // ensure we get a date
      if (!isNaN(parsed)) {
        order.delivered = tag;
        break;
      };
    };
    delete order.tags;
    order.line_items = order.line_items
        .map(el => {
        return {
          name: el.name,
          properties: el.properties,
          price: el.price,
          product_id: el.product_id,
          title: el.title,
          variant_title: el.variant_title,
        };
      });
    order.box = order.line_items.find(el => el.properties.some(e => e.name === "Including"));
    delete order.line_items; // more data than required
    return order;
  };
  return {}; // always return an object
};

