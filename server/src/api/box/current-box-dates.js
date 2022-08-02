/*
 * @module api/box/current-box-dates.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

/*
 * @function box/current-box-dates.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 *
 * Returns { boxes, dates } and only current for order-fields (for add and edit order)
 * If req.query.current will only return dates later than now
 */
export default async (req, res, next) => {
  const response = {};
  const now = new Date();
  const dateString = now.toISOString().replace("Z", "");
  const current = Object.hasOwnProperty.call(req.query, "current");
  // the current flag is used for adding and editing orders
  // otherwise for admin boxes we get back to a week ago
  if (!current) {
    now.setDate(now.getDate() - 7);
  };
  const aggregate = [];
  if (current) { // only active boxes for adding and editing orders
    aggregate.push(
      { "$match": {
        active: true,
      }},
    );
  };
  console.log(JSON.stringify(aggregate, null, 2));
  aggregate.push(
    { "$match": {
      shopify_title: {
        "$ne": null
    }}},
    { "$facet": {
      "boxes" : [
        { "$project": {
          shopify_title: "$shopify_title"
        }},
        { "$group": {
          _id: "$shopify_title"
        }},
      ],
      "dates" : [
        { "$group": {
          _id: "$delivered"
        }},
        { "$project": {
          delivered: "$_id",
          iso: { "$dateFromString": {dateString: "$_id", timezone: "Pacific/Auckland"}},
        }},
        { "$sort" : { iso: 1 } },
        { "$project": {
          _id: "$delivered"
        }},
      ],
      "fetchDates": [
        { "$project": {
          deliverDate: {
            "$dateFromString": {dateString: "$delivered", timezone: "Pacific/Auckland"}
          },
          delivered: "$delivered",
          active: "$active",
        }},
        // match only boxes later than last week
        { "$match": { deliverDate: { "$gte": now } } },
        { "$group": {
          _id: "$delivered",
          count: { "$sum": 1 },
          activeAll: {
            "$push": "$active",
          },
        }},
        { "$project": {
          delivered: "$_id",
          iso: { "$dateFromString": {dateString: "$_id", timezone: "Pacific/Auckland"}},
          count: "$count",
          allActive: {
            "$allElementsTrue": "$activeAll",
          },
        }},
        { "$sort" : { iso: 1 } },
        { "$project": {
          _id: "$delivered",
          count: "$count",
          active: "$allActive",
        }},
    ]}},
  );
  try {
    let result = await _mongodb.collection("boxes").aggregate(aggregate).toArray();
    result = result[0];
    response.dates = result.dates.map(el => el._id);
    response.boxes = result.boxes.map(el => el._id);
    response.fetchDates = result.fetchDates.map(({_id, count, active}) => ({ delivered: _id, count, active }));
    res.status(200).json(response);
  } catch(err) {
    res.status(400).json({ error: err.toString() });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};
