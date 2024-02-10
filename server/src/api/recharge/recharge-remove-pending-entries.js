/*
 * @module api/recharge/remove-pending-entries
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { ObjectID } from "mongodb";

/*
 * @function recharge/remove-pending-entries
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {

  console.log(req.body);
  const entries = req.body.selectedEntries.map(el => ObjectID(el));

  try {
    const query = { "_id": {"$in": entries }};
    console.log(query);

    const result = await _mongodb.collection("updates_pending").deleteMany(query);
    console.log(result);
    if (result.deletedCount > 0) return res.status(200).json(result);

    return res.status(200).json({ error: "None deleted" });
  
  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};


