/*
 * @module api/box/current-boxes-by-product.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { getDeliveryDays } from "../../lib/boxes.js";

/*
 * @function box/current-boxes-by-product.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 *
 * NOTE the client does not send weekday
 * NOTE this is used to collect boxes from the client Container Box
 * NOTE Also used by recharge/change-box modal to get boxes, includes weekday
 * in that case therefore the filters are not included
 */
export default async (req, res, next) => {
  const db = {
   orders: _mongodb.collection("orders"),
   boxes: _mongodb.collection("boxes"),
   settings: _mongodb.collection("settings"),
  };
  const response = Object();
  const product_id = parseInt(req.params.product_id);
  const weekday = req.params.weekday; // as lowercase named day of week

  // the dates are filtered using filter settings including order limits and cutoff hours
  // NOTE the client app does not send weekday, i.e. is undefined so filters are used
  const dates = await getDeliveryDays(db, product_id, weekday)
  
  try {
    const result = await db.boxes.find({
      delivered: {$in: dates},
      active: true,
      shopify_product_id: product_id
    }).toArray();

    result.forEach(el => {
      //el.selling_plans = selling_plans;
      response[el.delivered] = el;
    });
    res.status(200).json(response);

  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};
