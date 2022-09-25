/*
 * @module api/order/current-orders-by-date.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { sortObjectArrayByKey } from "../../lib/helpers.js";
import { getQueryFilters } from "../../lib/orders.js";
import { getNZDeliveryDay } from "../../lib/dates.js";
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

  let query = getQueryFilters(req, {
    product_id: {$ne: null},
    delivered: { $in: [deliveryDay, NODELIVER_STRING]}
  });

  try {
    collection.find(query).toArray((err, result) => {
      if (err) throw err;

      // order by box title
      response.orders = sortObjectArrayByKey(result, 'product_title');
      response.headers = headersPartial;
      res.set('Content-Type', 'application/json');
      res.write(JSON.stringify(response));
      res.end();
    });
  } catch(err) {
    res.status(400).json({ error: err.toString() });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};
