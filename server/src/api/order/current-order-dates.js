/*
 * @module api/order/current-order-dates.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

/*
 * @function order/current-orders-by-date.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {
  //   response: { date: {orders: count}}
  const collection = _mongodb.collection("orders");
  const response = {};
  try {
    // get order counts by date
    const cursor = await _mongodb.collection("orders").aggregate([
      { $group: {
          _id: "$delivered",
          count: { $sum: 1 }
      }},
      { "$project": {
        delivered: "$_id",
        count: "$count",
        iso: { "$dateFromString": {dateString: "$_id", timezone: "Pacific/Auckland"}},
      }},
      { "$sort" : { iso: 1 } },
    ]).toArray();
    for (const { _id, count } of cursor) {
      response[_id] = {"orders": count};
    };
    
    // collect orders with an error
    response.errored = await _mongodb.collection("orders").find(
      { error: { "$exists": true} },
    ).sort({ created: -1 }).toArray();

    res.status(200).json(response);
  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};


