/*
 * @module api/setting/add-setting.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { mongoInsert } from "../../lib/mongo/mongo.js";
import { ObjectId } from "mongodb"; // only after mongodb@ -> mongodb@6

/*
 * @function setting/add-setting.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {
  _logger.info(JSON.stringify(req.body, null, 2));
  const doc = {...req.body};
  doc._id = new ObjectId();
  try {
    const result = await mongoInsert(_mongodb.collection("settings"), doc);
    res.status(200).json(result);
  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};
