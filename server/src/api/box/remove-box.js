/*
 * @module api/box/remove-box.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { ObjectID } from "mongodb";

/*
 * @function box/remove-box.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {

  const collection = _mongodb.collection("boxes");
  collection.findOne(req.body, async (e, box) => {
    if (e) _logger.info(`${_filename(import.meta)} Got error ${e}`);
    await collection.deleteOne({_id: ObjectID(req.body._id)}, (e, result) => {
      res.status(200).json(result);
    });
  });
};
