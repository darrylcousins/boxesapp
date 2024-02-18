/*
 * @module api/box/toggle-box-active.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { ObjectId } from "mongodb"; // only after mongodb@ -> mongodb@6
/*
 * @function box/toggle-box-active.js
 * Remove a product from the box, parameters from req.body:
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {

  const {box_id, delivered, active} = req.body;
  const collection = _mongodb.collection("boxes");

  try {
    let result;
    if (box_id && !delivered) {
      result = await collection.updateOne(
        {_id: new ObjectId(box_id)},
        {$set: {active}}
      );
      res.status(200).json(result);
    } else if (!box_id && delivered) {
      result = await collection.updateMany(
        {delivered},
        {$set: {active}}
      );
      res.status(200).json(result);
    };
  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};


