/*
 * @module api/box/current-boxes-by-date.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { getFilterSettings } from "../../lib/settings.js";
import { getNZDeliveryDay } from "../../lib/dates.js";

/*
 * @function box/current-boxes-by-date.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {
  // get current box by selected date and shopify product id
  const collection = _mongodb.collection("boxes");
  const deliveryDay = getNZDeliveryDay(req.params.timestamp);
  const weekday = new Date(Date.parse(deliveryDay)).getDay();
  const response = {};
  let settings;
  try {
    response.boxes = await collection.find({ delivered: deliveryDay }).sort({shopify_title: 1}).toArray();
    settings = await getFilterSettings(_mongodb.collection("settings"));
    if (Object.keys(settings).includes(weekday.toString())) {
      response.settings = settings[weekday];
    } else {
      response.settings = {};
    };
    res.status(200).json(response);
  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};
