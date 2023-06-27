/*
 * @module api/shopify/query-store-boxes.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { queryStoreProducts } from "../../lib/shopify/helpers.js";

/*
 * @function shopify/query-store-boxes.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {

  let search = "";
  if (req.body.search) search = req.body.search;
  if (search.trim() === "") search = " ";
  let boxes = null;
  if (req.body.delivered) {
    // a timestamp
    const delivered = new Date(req.body.delivered).toDateString();
    boxes = await _mongodb.collection("boxes").find({delivered}).toArray();
    boxes = boxes.map(el => el.shopify_title);
  };

  try {
    let result = await queryStoreProducts(search, "Container Box");
    if (boxes) {
      result = result.filter(el => !boxes.includes(el.title));
    };
    res.status(200).json(result);
  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};
