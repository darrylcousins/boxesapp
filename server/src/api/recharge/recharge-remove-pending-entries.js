/*
 * @module api/recharge/remove-pending-entries
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { ObjectId } from "mongodb";

/*
 * @function recharge/remove-pending-entries
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {

  const entries = req.body.selectedEntries.map(el => new ObjectId(el));

  try {
    const query = { "_id": {"$in": entries }};

    const result = await _mongodb.collection("updates_pending").deleteMany(query);
    if (result.deletedCount > 0) return res.status(200).json(result);

    return res.status(200).json({ error: "None deleted" });
  
  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};


