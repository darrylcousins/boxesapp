/*
 * @module api/order/packing-list.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { getSettings } from "../../lib/orders.js";
import { collatePackingData } from "../../lib/orders.js";
import { getQueryFilters } from "../../lib/orders.js";
import { getNZDeliveryDay } from "../../lib/dates.js";

/*
 * @function order/packing-list.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {

  try {
    const deliveryDay = getNZDeliveryDay(req.params.timestamp);
    const query = getQueryFilters(req, {delivered: deliveryDay});
    const settings = await getSettings();
    const packingData = await collatePackingData({req, deliveryDay, query, settings});

    res.status(200).json({
      packingData,
      settings,
    });
  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};
