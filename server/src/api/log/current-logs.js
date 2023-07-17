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
export default async (req, res) => {

  const { level, page, object } = req.params;

  const collection = _mongodb.collection("logs");

  const query = {};
  // first set up filters
  if (level && level !== "all") query.level = level;
  if (object) query[`meta.${object}`] = { "$exists": true };

  try {

    const count = await collection.count(query);
    const pageSize = 50;

    const currentPage = page;
    const pageCount = Math.ceil(count/pageSize);
    const skip = (currentPage - 1) * pageSize;

    const logs = await collection.find(query).sort({ timestamp: -1 }).limit(pageSize).skip(skip).toArray();

    const response = {
      pageCount,
      pageNumber: currentPage,
      logs
    };

    res.status(200).json(response);
  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};
