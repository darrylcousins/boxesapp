/*
 * @module api/recharge/recharge-customer.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { makeRechargeQuery } from "../../lib/recharge/helpers.js";

/*
 * @function recharge/recharge-customer.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {
  // get recharge customer using shopify customer id
  // handles all customers as well
  let shopify_customer_id
  let recharge_customer_id
  let query;
  let path = "customers";
  if (Object.hasOwnProperty.call(req.query, "cursor")) {
    query = [ ["limit", 50 ] ]; // 50 is the default - can go to 250
    if (req.query.cursor !== "null") {
      query.push(["cursor", req.query.cursor ]);
    };
  } else {
    if (Object.hasOwnProperty.call(req.params, "shopify_customer_id")) {
      shopify_customer_id = req.params.shopify_customer_id;
      query = [ ["external_customer_id", shopify_customer_id ] ];
    };
    if (Object.hasOwnProperty.call(req.params, "recharge_customer_id")) {
      path = `${path}/${req.params.recharge_customer_id}`;
    };
  };

  try {
    const result = await makeRechargeQuery({
      path,
      query
    });
    if (result.customer) {
      res.status(200).json(result.customer);
      return;
    };
    if (!result.customers || !result.customers.length) {
      res.status(200).json([]);
      return;
    };
    if (typeof shopify_customer_id !== "undefined") {
      res.status(200).json(result.customers[0]);
    } else {
      res.status(200).json(result); // includes next_cursor and previous_cursor
    };
  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};
