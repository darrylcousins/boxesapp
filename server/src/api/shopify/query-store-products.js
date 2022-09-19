/*
 * @module api/shopify/query-store-products.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { queryStoreProducts } from "../../lib/shopify/helpers.js";

/*
 * @function shopify/query-store-products.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {
  _logger.info(JSON.stringify(req.body, null, 2));

  let search = "";
  if (req.body.search) search = req.body.search;
  if (search.trim() === "") search = " ";

  try {
    const result = await queryStoreProducts(search, "Box Produce");
    res.status(200).json(result);
  } catch(err) {
    res.status(400).json({ error: err.toString() });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };

};
