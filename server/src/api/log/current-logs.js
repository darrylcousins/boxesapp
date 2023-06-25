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

  console.log(timestamp);
  console.log(level);

  if (!timestamp) {
    res.status(200).json({ error: "No timestamp provided" });
    return;
  };

  const collection = _mongodb.collection("logs");
  try {

    const time = parseInt(timestamp);

    // one day at a time
    const today = new Date(time);
    const yesterday = new Date(time);
    const tomorrow = new Date(time);
    yesterday.setDate(today.getDate() - 1);
    tomorrow.setDate(today.getDate() + 2);

    // get date strings
    const current = today.toISOString().split("T")[0];
    const previous = yesterday.toISOString().split("T")[0];
    let next = tomorrow.toISOString().split("T")[0];

    const query = {};
    // first set up filters
    if (level && level !== "all") query.level = level;
    if (object) query[`meta.${object}`] = { "$exists": true };
    // add time filter
    query["$and"] = [
      {timestamp: { "$gt": yesterday }},
      {timestamp: { "$lte": tomorrow }},
    ];

    const pipeline = [
      { "$match": query },
      { "$group": {
        _id : { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
        "count": { "$sum": 1 },
      }},
      { "$sort": { _id: 1 }},
    ];

    // get counts
    const result = await collection.aggregate(pipeline).toArray();
    console.log(result);
    const counts = result.reduce(
      (acc, curr) => Object.assign(acc, { [`${curr._id}`]: curr.count }),
      {});

    // update tomorrow and the query to get results for the day
    tomorrow.setDate(tomorrow.getDate() - 1);
    next = tomorrow.toISOString().split("T")[0];
    query["$and"] = [
      {timestamp: { "$gt": today }},
      {timestamp: { "$lt": tomorrow }},
    ];
    console.log(query);
    const logs = await collection.find(query).sort({ timestamp: -1 }).toArray();

    // compile the response
    const response = {};
    response.previous = { date: previous, count: 0 };
    response.current = { date: current, count: 0, logs: logs };
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
    console.log(response);

    res.status(200).json(response);
  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};
