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

  const { level, timestamp, object } = req.params;

  const formatDate = (date) => {
    const getYear = date.toLocaleString("default", { year: "numeric" });
    const getMonth = date.toLocaleString("default", { month: "2-digit" });
    const getDay = date.toLocaleString("default", { day: "2-digit" });
    return `${getYear}-${getMonth}-${getDay}`;
  };

  if (!timestamp) {
    res.status(200).json({ error: "No timestamp provided" });
    return;
  };

  const collection = _mongodb.collection("logs");

  try {
    let time = parseInt(timestamp);
    let start = new Date(time);

    const offset = start.getTimezoneOffset()
    start = new Date(start.getTime() - (offset*60*1000))

    start = start.toISOString().split("T")[0];

    // mongodb logs are stored in ISOTime so need to adjust for timezone

    // one day at a time
    const today = new Date(`${start}T00:00:00`);
    let yesterday = new Date(`${start}T00:00:00`);
    let tomorrow = new Date(`${start}T00:00:00`);
    yesterday.setHours(today.getHours() - 24);
    tomorrow.setHours(today.getHours() + 24);

    // get date strings
    const current = start;
    const previous = formatDate(yesterday);
    const next = formatDate(tomorrow);

    const query = {};
    // first set up filters
    if (level && level !== "all") query.level = level;
    if (object) query[`meta.${object}`] = { "$exists": true };
    // add time filter
    const match = { ...query };
    match["$and"] = [
      {timestamp: { "$gte": yesterday }},
      {timestamp: { "$lte": tomorrow }},
    ];

    const pipeline = [
      { "$match": match },
      { "$group": {
        _id : { $dateToString: { format: "%Y-%m-%d", date: "$timestamp", timezone: "+12:00" } },
        "count": { "$sum": 1 },
      }},
      { "$sort": { _id: 1 }},
    ];

    // get counts
    const result = await collection.aggregate(pipeline).toArray();
    const counts = result.reduce(
      (acc, curr) => Object.assign(acc, { [`${curr._id}`]: curr.count }),
      {});

    query["$and"] = [
      {timestamp: { "$gt": yesterday }},
      {timestamp: { "$lt": tomorrow}},
    ];
    const logs = await collection.find(query).sort({ timestamp: -1 }).toArray();

    // compile the response
    const response = {};
    response.previous = { date: previous, count: 0 };
    response.current = { date: current, count: logs.length, logs: logs };
    response.next = { date: next, count: 0 };

    if (Object.keys(counts).includes(previous)) {
      response.previous.count = counts[previous];
    };
    if (Object.keys(counts).includes(current)) {
      response.current.count = counts[current];
    };
    if (Object.keys(counts).includes(next)) {
      response.next.count = counts[next];
    };

    res.status(200).json(response);
  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};
