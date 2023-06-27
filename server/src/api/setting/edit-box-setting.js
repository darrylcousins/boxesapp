/*
 * @module api/setting/edit-box-setting.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

/*
 * @function setting/edit-box-setting.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {
  try {
    for (const setting of req.body) {
      const { handle, weekday, value } = setting;
      const result = await _mongodb.collection("settings").updateOne(
        { handle, weekday },
        { $set: { value: parseFloat(value) } },
        { upsert: true }
      );
      _logger.info(JSON.stringify(result, null, 2));
    }
    res.status(200).json(true);
  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};
