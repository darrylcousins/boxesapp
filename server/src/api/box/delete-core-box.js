/*
 * @module api/box/delete-core-box.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

/*
 * @function box/delete-core-box.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {
  _logger.info(JSON.stringify(req.body, null, 2));

  const delivered = "Core Box";
  const collection = _mongodb.collection("boxes");
  try {
    await collection.deleteOne({delivered}, (e, result) => {
      res.status(200).json(result);
    });
  } catch(err) {
    res.status(400).json({ error: err.toString() });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};
