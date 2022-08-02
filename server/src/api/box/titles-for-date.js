/*
 * @module api/box/titles-for-date.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { getNZDeliveryDay } from "../../lib/dates.js";

/*
 * @function box/titles-for-date.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {
  // get current box by selected date and shopify product id
  const collection = _mongodb.collection("boxes");
  const deliveryDay = getNZDeliveryDay(req.params.timestamp);
  const response = {};
  try {
    response.boxes = await collection
      .find({ delivered: deliveryDay, active: true })
      .project({shopify_title: 1})
      .sort({shopify_title: 1}).toArray();
    res.status(200).json(response);
  } catch(err) {
    res.status(400).json({ error: err.toString() });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};

