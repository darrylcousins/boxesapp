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
  _logger.info(JSON.stringify(req.body, null, 2));

  const collection = _mongodb.collection("boxes");
  const { delivered } = req.body;
  const query = {delivered};
  const response = Object();
  try {
    collection.deleteMany(query, (err, result) => {
      if (err) throw err;
      _logger.info(`${_filename(import.meta)} Removing boxes: ${result.deletedCount} objects deleted`);
      res.status(200).json({ count: result.deletedCount });
    });
  } catch(err) {
    res.status(400).json({ error: err.toString() });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};
