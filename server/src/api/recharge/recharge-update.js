/*
 * @module api/recharge/recharge-update.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { updateSubscriptions } from "../../lib/recharge/helpers.js";

/*
 * @function recharge/recharge-update.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {

  const { updates } = req.body;

  try {

    const { includes } = await updateSubscriptions({ updates });
    const response = { includes };

    // only return items that have been added, i.e. a POST

    res.status(200).json(response);

  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};

