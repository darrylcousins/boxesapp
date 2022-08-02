/*
 * @module api/setting/current-settings.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

/*
 * @function setting/current-settings.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {
  const collection = _mongodb.collection("settings");
  try {
    collection.aggregate(
      [{
        $group: {
          _id: "$tag",
          settings: { $push: "$$ROOT" }
        }
      },
      ]).toArray((err, result) => {
        if (err) throw err;
        res.status(200).json(result);
    });
  } catch(err) {
    res.status(400).json({ error: err.toString() });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};
