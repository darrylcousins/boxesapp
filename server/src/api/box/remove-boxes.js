/*
 * @module api/box/remove-boxes.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

/*
 * @function box/remove-boxes.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {

  const collection = _mongodb.collection("boxes");
  const { delivered } = req.body;
  const query = {delivered};
  const response = Object();
  try {
    const result = await collection.deleteMany(query);

    res.status(200).json({ count: result.deletedCount });

  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};
