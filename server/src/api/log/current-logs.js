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
  let searchDates;
  if (object_id) { // added time as an option

    const decoded = decodeURIComponent(object_id);
    if (decoded !== object_id) { // if given an interger id then they will be the same
      const searchFrom = new Date(Date.parse(decoded));
      if (validDate(searchFrom)) {
        searchDates = [];
        //searchFrom.setMinutes(searchFrom.getMinutes() + searchFrom.getTimezoneOffset());
        searchFrom.setMinutes(searchFrom.getMinutes() - 15);
        searchDates.push(new Date(searchFrom));
        searchFrom.setMinutes(searchFrom.getMinutes() + 30);
        searchDates.push(new Date(searchFrom));
      };
    } else {
      searchTerm = parseInt(object_id);
    };
  };

  const query = {};
  const orQuery = [];

  // first set up filters
  if (level && level !== "all") query.level = level;
  if (object && object !== "all") {
    query[`meta.${object}`] = { "$exists": true };
    // add in a search term
    if (searchTerm) {
      if (object === "recharge") {
        orQuery.push(
          { [`meta.${object}.customer_id`]: searchTerm },
          { [`meta.${object}.subscription_id`]: searchTerm },
          { [`meta.${object}.charge_id`]: searchTerm },
        );
      } else if (object === "shopify") {
        orQuery.push(
          { [`meta.${object}.shopify_order_id`]: searchTerm },
          { [`meta.${object}.order_number`]: searchTerm },
        );
      };
    };
  };
  if (level === "error") { // include the fetch errors stored as notices
    // a wildcard operator would be handy:
    //query[`meta.*.error`] = { "$exists": true };
    // but is unsupported, it could be donw with aggregation:
    // 1. add a new field "newNode: { $objectToArray: "meta" }
    // 2. then newNode.v.error: { $exists: true } // with v being the default value of the array
    // However I've only got shopify and recharge to worry about
    /*
    orQuery.push(
      { "meta.recharge.error": { "$exists": true } },
      { "meta.shopify.error": { "$exists": true } },
    );
    query.level = { "$in": ["notice", "error"] };
    */
  };
  if (orQuery.length > 0) query["$or"] = orQuery;

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
    if (searchDates) {
      query.timestamp = {"$gte": searchDates[0], "$lt": searchDates[1] };
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
