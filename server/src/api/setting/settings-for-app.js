/*
 * @module api/setting/settings-for-app.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

/*
 * @function setting/settings-for-app.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {
  const collection = _mongodb.collection("settings");
  const response = {};
  try {
    const result = await collection.aggregate(
      [{
        $group: {
          _id: "$tag",
          settings: { $push: { handle: "$handle", value: "$value" } }
        },
      },
      ]).toArray();

    result.forEach(el => {
      response[el._id] = {};
      el.settings.forEach(setting => {
        response[el._id][setting.handle] = setting.value;
      });
    });
    res.status(200).json(response);

  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};
