/*
 * @module api/setting/edit-settings.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { mongoUpdate } from "../../lib/mongo/mongo.js";
import { ObjectId } from "mongodb";

/*
 * @function setting/edit-settings.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {
  _logger.info(JSON.stringify(req.body, null, 2));
  const response = [];
  try {
    await req.body.forEach(async (doc) => {
      doc._id = new ObjectId(doc._id);
      const result = await mongoUpdate(_mongodb.collection("settings"), doc);
      response.push(result);
    });
    res.status(200).json(response);
  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};
