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
 *
 * Jun 2023 No longer used for getting all customers (admin ui subscribers view
 * now uses customers stored in mongodb)
 */
export default async (req, res, next) => {
  // get recharge customer using shopify customer id
  let path = "customers";
  let query;

  // returns { customer }
  if (Object.hasOwnProperty.call(req.query, "recharge_customer_id")) {
    path = `${path}/${req.query.recharge_customer_id}`;
  };

  // returns { customers }
  if (Object.hasOwnProperty.call(req.query, "shopify_customer_id")) {
    query = [ ["external_customer_id", req.query.shopify_customer_id ] ]
  };

  try {
    const result = await makeRechargeQuery({
      path,
      query,
      title: "Recharge Customer"
    });
    console.log(result);
    if (result.customer) {
      res.status(200).json(result.customer);
      return;
    };
    if (result.customers) {
      res.status(200).json(result.customers[0]);
      return;
    };
    // deprecated
    if (!result.customers || !result.customers.length) {
      res.status(200).json([]);
      return;
    };
  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};
