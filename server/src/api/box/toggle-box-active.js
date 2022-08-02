/*
 * @module api/box/toggle-box-active.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { ObjectID } from "mongodb";

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

  if (box_id && !delivered) {
    collection.updateOne(
      {_id: ObjectID(box_id)},
      {$set: {active}}
      , async (err, result) => {
      if (err) {
        _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
      };

      res.status(200).json(result);
    });
  } else if (!box_id && delivered) {
    collection.updateMany(
      {delivered},
      {$set: {active}}
      , async (err, result) => {
      if (err) {
        _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
      };

      res.status(200).json(result);
    });
  };
};


