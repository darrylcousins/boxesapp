/*
 * @module api/box/get-core-box.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

/*
 * @function box/get-core-box.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {
  // get core box
  const collection = _mongodb.collection("boxes");
  const response = Array();
  try {
    const box = await collection.findOne({ delivered: 'Core Box' });
    if (box) return res.status(200).json({ box });
    return res.status(200).json({ box: null });
  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};
