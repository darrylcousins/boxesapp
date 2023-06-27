/*
 * @module api/order/picking-list.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { getSettings, getQueryFilters, collatePickingData } from "../../lib/orders.js";
import { getNZDeliveryDay } from "../../lib/dates.js";

/*
 * @function order/picking-list.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {

  try {
    const deliveryDay = getNZDeliveryDay(req.params.timestamp);
    const query = getQueryFilters(req, {delivered: deliveryDay});
    const settings = await getSettings();
    const pickingData = await collatePickingData({req, deliveryDay, query, settings});

    res.status(200).json({
      pickingData,
      settings,
    });
  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};
