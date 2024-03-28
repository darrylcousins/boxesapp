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

  // XXX Trashed from and to in favour of search field date search
  let { from, to } = req.query;

  const validDate = (d) => {
    if (!d) return false;
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

  // helper
  if (object_id) { // added time as an option

    const decoded = decodeURIComponent(object_id);
    let parts = decoded.split("and").map(el => el.trim()).filter(el => el !== "");

    if (parts.length > 2) {
      res.status(200).json({ error: `Too many search terms: ${parts.join(", ")}. Try a date and an id only.` });
    };

    let searchFrom;
    for (const part of parts) {
      if (new RegExp(/^[0-9]*$/).test(part)) {
        if (!isNaN(parseInt(part)) && !searchTerm) {
          searchTerm = parseInt(part);
        } else if (!isNaN(parseInt(part))) {
          return res.status(200).json({ error: `Unable to search on 2 ids: ${searchTerm}, ${part}` });
        };
      } else {
        const d = new Date(Date.parse(part));
        if (validDate(d) && !searchFrom) {
          searchFrom = d;
        } else if (validDate(d) && searchFrom) {
          return res.status(200).json({ error: `Unable to search on 2 dates: ${searchFrom.toDateString()}, ${part}` });
        } else {
          return res.status(200).json({ error: `Unable to parse the date string: ${part}` });
        };
      };
    };

    if (searchFrom) {
      searchDates = [];
      //searchFrom.setMinutes(searchFrom.getMinutes() + searchFrom.getTimezoneOffset());
      const deltaSwitch = decoded.split(":").length;
      searchDates.push(new Date(searchFrom));

      if (deltaSwitch === 1) {
        searchFrom.setDate(searchFrom.getDate() + 1);
      } else if (deltaSwitch === 2) {
        searchFrom.setHours(searchFrom.getHours() + 1);
      } else {
        searchFrom.setMinutes(searchFrom.getMinutes() + 1);
      };
      searchDates.push(new Date(searchFrom));
    };
  };

  const query = {};
  const orQuery = [];

  // first set up filters
  if (level && level !== "all") query.level = level;
  if (searchTerm && object !== "all") {
    orQuery.push(
      { [`meta.${object}.customer_id`]: { "$eq" : searchTerm, "$exists": true } },
      { [`meta.${object}.subscription_id`]: { "$eq" : searchTerm, "$exists": true } },
      { [`meta.${object}.charge_id`]: { "$eq" : searchTerm, "$exists": true } },
      { [`meta.${object}.shopify_order_id`]: { "$eq" : searchTerm, "$exists": true } },
      { [`meta.${object}.order_number`]: { "$eq" : searchTerm, "$exists": true } },
    );
  } else if (searchTerm && object === "all") {
    orQuery.push(
      { [`meta.recharge.customer_id`]: { "$eq" : searchTerm, "$exists": true } },
      { [`meta.recharge.subscription_id`]: { "$eq" : searchTerm, "$exists": true } },
      { [`meta.recharge.charge_id`]: { "$eq" : searchTerm, "$exists": true } },
      { [`meta.shopify.shopify_order_id`]: { "$eq" : searchTerm, "$exists": true } },
      { [`meta.shopify.order_number`]: { "$eq" : searchTerm, "$exists": true } },
    );
  } else if (!searchTerm && object !== "all") {
    query[`meta.${object}`] = { "$exists": true };
  };
  if (level === "error") { // include the fetch errors stored as notices
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

    if (searchDates) {
      query.timestamp = {"$gte": searchDates[0], "$lt": searchDates[1] };
    };

    let oldestDate;
    const first = await collection.find(query).project({ timestamp: 1 }).sort({ timestamp: 1 }).limit(1).toArray();
    if (first.length > 0) {
      oldestDate = formatDate(first[0].timestamp);
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
