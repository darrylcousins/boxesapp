/*
 * @module api/order/data-sources.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { getNZDeliveryDay } from "../../lib/dates.js";
/*
 * @function order/data-sources.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 *
 * Return distinct list of sources for the orders
 */
export default async (req, res, next) => {
  const deliveryDay = getNZDeliveryDay(req.params.timestamp);
  try {
    const query = { delivered: deliveryDay }; // in case we want to add in delivery date
    const result = await _mongodb.collection("orders").distinct("source.type", query);
    res.status(200).json(result.map(el => el.toLowerCase()));
  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};

