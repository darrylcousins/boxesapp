/*
 * @module api/box/box-by-date-and-product.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { getNZDeliveryDay } from "../../lib/dates.js";

/*
 * @function box/box-by-date-and-product.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {
  // get current box by selected date and shopify product id
  const collection = _mongodb.collection("boxes");
  const response = Array();
  const deliveryDay = getNZDeliveryDay(req.params.timestamp);
  const product_id = parseInt(req.params.product_id);
  try {
    const box = await collection.findOne({ delivered: deliveryDay, shopify_product_id: product_id });
    // XXX return something if no box
    res.status(200).json(box);
  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};
