/*
 * @module api/setting/box-rules-for-app.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

/*
 * @function setting/box-rules-for-app.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {
  const collection = _mongodb.collection("settings");
  const response = {};
  try {
    collection.find({handle: "box-rule"},
      {projection: {boxes: 1, box_product_ids: 1,  weekday: 1, value: 1}}).toArray((err, result) => {
        if (err) throw err;
        res.status(200).json(result);
    });
  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};
