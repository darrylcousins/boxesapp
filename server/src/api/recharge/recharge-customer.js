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
  const shopify_customer_id = req.params.shopify_customer_id;
  try {
    const { customers } = await makeRechargeQuery({
      path: `customers`,
      query: [ ["external_customer_id", shopify_customer_id ] ]
    });
    if (!customers || !customers.length) {
      res.status(200).json([]);
      return;
    };
    res.status(200).json(customers[0]);
  } catch(err) {
    res.status(400).json({ error: err.toString() });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};
