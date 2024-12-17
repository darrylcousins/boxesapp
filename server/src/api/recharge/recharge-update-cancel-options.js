/*
 * @module api/recharge/update-cancel-options
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

/*
 * @function recharge/update-cancel-options
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {

  const options = req.body.options;
  const query = {
    handle: "recharge-cancel-options"
  };
  const doc = {
    ...query,
    tag: "recharge-cancel-options",
    options,
  };

  try {
    const result = await _mongodb.collection("settings").updateOne(
      query,
      { "$set" : doc },
      { "upsert": true }
    );
    res.status(200).json(result);
  
  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};

