/*
 * @module api/shopify/shopify-customer.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { makeShopQuery } from "../../lib/shopify/helpers.js";

/*
 * @function shopify/shopify-customer.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {
  const customer_id = parseInt(req.params.customer_id);
  const path = `customers/${req.params.customer_id}.json`;
  const fields = ["id", "email", "first_name", "last_name"];
  try {
    const result = await makeShopQuery({path, fields})
      .then(async ({customer}) => {
        return customer;
      });
    res.status(200).json({ customer: result });
  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};

