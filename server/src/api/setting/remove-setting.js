/*
 * @module api/setting/remove-setting.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { mongoRemove } from "../../lib/mongo/mongo.js";
import { ObjectId } from "mongodb"; // only after mongodb@ -> mongodb@6

/*
 * @function setting/remove-setting.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {
  const doc = {...req.body};
  doc._id = new ObjectId(doc._id);
  _logger.info(JSON.stringify(doc, null, 2));
  try {
    const result = await mongoRemove(_mongodb.collection("settings"), doc);
    _logger.info(JSON.stringify(result, null, 2));
    res.status(200).json(result);
  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};
