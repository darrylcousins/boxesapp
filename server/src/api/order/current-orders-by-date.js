/*
 * @module api/order/current-orders-by-date.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { sortObjectArrayByKey } from "../../lib/helpers.js";
import { getQueryFilters } from "../../lib/orders.js";
import { getNZDeliveryDay, weekdays } from "../../lib/dates.js";
import { NODELIVER_STRING, headersPartial } from "../../lib/constants.js";

/*
 * @function order/current-orders-by-date.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {

  const deliveryDay = getNZDeliveryDay(req.params.timestamp);
  const collection = _mongodb.collection("orders");
  const response = Object();

  const checkDate = new Date(parseInt(req.params.timestamp));

  let searchDate;
  if (isNaN(checkDate)) {
    searchDate = NODELIVER_STRING;
  } else {
    searchDate = deliveryDay;
  };

  let query = getQueryFilters(req, {
    product_id: {$ne: null},
    delivered: searchDate,
  });

  try {
    const result = await collection.find(query).sort({ "product_title": 1, "last_name": 1 }).toArray();

    response.orders = result
    response.headers = headersPartial;
    res.status(200).json(response);
  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};
