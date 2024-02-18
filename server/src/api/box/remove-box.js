/*
 * @module api/box/remove-box.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { ObjectId } from "mongodb";

/*
 * @function box/remove-box.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {

  const collection = _mongodb.collection("boxes");
  try {
    const box = await collection.findOne({_id: new ObjectId(req.body._id)});
    if (box) {
      const result = await collection.deleteOne({_id: new ObjectId(box._id)});
      return res.status(200).json(result);
    };
    return res.status(200).json({ error: "Unable to find the box" });
  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};
