/*
 * @module api/log/current-logs.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

/*
 * @function log/current-logs.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {
  let level = req.params.level;
  let object = req.params.object;

  const query = {};
  if (level && level !== "all") query.level = level;
  if (object) query[`meta.${object}`] = { "$exists": true };

  const collection = _mongodb.collection("logs");
  try {
    const logs = await collection.find(query).sort({ timestamp: -1 }).toArray();
    res.status(200).json({ logs });
  } catch(err) {
    res.status(400).json({ error: err.toString() });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};
