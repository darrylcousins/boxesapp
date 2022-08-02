/*
 * @module api/setting/edit-setting.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { mongoUpdate } from "../../lib/mongo/mongo.js";
import { ObjectID } from "mongodb";

/*
 * @function setting/edit-setting.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {
  _logger.info(JSON.stringify(req.body, null, 2));
  const doc = {...req.body};
  doc._id = ObjectID(doc._id);
  _logger.info(JSON.stringify(doc, null, 2));
  try {
    const result = await mongoUpdate(_mongodb.collection("settings"), doc);
    _logger.info(JSON.stringify(result, null, 2));
    res.status(200).json(result);
  } catch(err) {
    res.status(400).json({ error: err.toString() });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};
