/*
 * @module api/log/current-logs.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { formatDate } from "../../lib/helpers.js";
/*
 * @function log/current-logs.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res) => {

  const { level, page, object, object_id, fromDate, toDate } = req.params;
  let { from, to } = req.query;

  const validDate = (d) => {
    if (d.toString() === "Invalid Date") return false;
    if (Number.isNaN(d.getTime())) return false;
    if (!(d instanceof Date)) return false;
    return true;
  };
  if (from) from = new Date(parseInt(from));
  if (to) to = new Date(parseInt(to));
  if (!validDate(from)) from = null;
  if (!validDate(to)) to = null;

  // object_id is a recharge customer_id or a subscription_id, charge_id, order_id, order_number

  const collection = _mongodb.collection("logs");

  let searchTerm;
  if (object_id) {
    searchTerm = parseInt(object_id);
    if (Number.isNaN(searchTerm)) {
      searchTerm = decodeURIComponent(object_id);
    };
  };

  const query = {};

  // first set up filters
  if (level && level !== "all") query.level = level;
  if (object) {
    query[`meta.${object}`] = { "$exists": true };
    // add in a search term
    if (searchTerm) query["$or"] = object === "recharge" ? [
      { [`meta.${object}.customer_id`]: searchTerm },
      { [`meta.${object}.subscription_id`]: searchTerm },
      { [`meta.${object}.charge_id`]: searchTerm },
    ] : [
      { [`meta.${object}.shopify_order_id`]: searchTerm },
      { [`meta.${object}.order_number`]: searchTerm },
    ];
  };

  try {

    let oldestDate;
    const first = await collection.find(query).project({ timestamp: 1 }).sort({ timestamp: 1 }).limit(1).toArray();
    if (first.length > 0) {
      oldestDate = formatDate(first[0].timestamp);
    };

    if (from && to) {
      // push the displayed/selected date forward a day so as to include that day
      to.setDate(to.getDate() + 1);
      // push the hours back by timezone offset for UTC time as stored in mongo
      to.setMinutes(to.getMinutes() + to.getTimezoneOffset());
      from.setMinutes(from.getMinutes() + from.getTimezoneOffset());
      query.timestamp = {"$gte": from, "$lt": to };
    };

    const count = await collection.count(query);
    const pageSize = 50;

    let currentPage = page;
    const pageCount = Math.ceil(count/pageSize);
    let skip = (currentPage - 1) * pageSize;
    if (skip > count) { // if query has changed, should do this on frontend maybe?
      skip = 0;
      currentPage = 1;
    };

    const logs = await collection.find(query).sort({ timestamp: -1 }).limit(pageSize).skip(skip).toArray();

    const response = {
      pageCount,
      pageNumber: currentPage,
      logs,
      count,
      pageSize,
      oldestDate,
    };

    res.status(200).json(response);
  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};
