/*
 * @module api/setting/edit-setting.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { mongoUpdate } from "../../lib/mongo/mongo.js";
import { ObjectId } from "mongodb";

/*
 * @function setting/edit-setting.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {
  const doc = {...req.body};
  doc._id = new ObjectId(doc._id);
  try {
    const result = await mongoUpdate(_mongodb.collection("settings"), doc);
    console.log(result);
    res.status(200).json(result);
  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};
