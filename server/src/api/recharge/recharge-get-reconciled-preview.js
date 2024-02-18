/*
 * @module api/recharge/recharge-get-reconciled-preview.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import reconcileBoxLists from "../reconcile-box-lists.js";

/*
 * @function order/get-reconciled-preview.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 *
 * Body included the boxLists formed from the subscription and the box (whatever the date)
 */
export default async (req, res, next) => {

  try {
    const { box, boxLists } = req.body;

    const { properties, messages } = await reconcileBoxLists(box, boxLists);
    return res.status(200).json({ properties, messages });

  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };

};
