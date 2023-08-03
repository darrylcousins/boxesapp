/*
 * @module api/recharge/get-cancel-options
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

/*
 * @function recharge/get-cancel-options
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {
  const collection = _mongodb.collection("settings");
  try {
    const result = await collection.findOne({handle: "recharge-cancel-options"});
    if (result) {
      return res.status(200).json({ options: result.options });
    } else {
      return res.status(200).json({ options: null });
    };
  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};

