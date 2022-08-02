/*
 * @module api/box/current-box-titles-days.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

/*
 * @function box/current-box-titles-days.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {
  // return used box titles and weekdays
  const collection = _mongodb.collection("boxes");
  const response = {};
  const dayMap = {
    'Monday': 1,
    'Tuesday': 2,
    'Wednesday': 3,
    'Thursday': 4,
    'Friday': 5,
    'Saturday': 6,
    'Sunday': 7
  };
  try {
    collection.aggregate([
      {
        $group: {
          _id: {
            delivered: "$delivered",
            shopify_title: "$shopify_title"
          }
        }
      },
      {
        "$project": {
          _id: 0,
          delivered: "$_id.delivered",
          shopify_title: "$_id.shopify_title"
        }
      }
      ]).toArray((err, result) => {
        const boxes = result.filter(el => Object.hasOwnProperty.call(el, 'shopify_title'));
        if (err) throw err;
        response.boxes = [...new Set(boxes
          .map(el => el.shopify_title))].sort();
        response.weekdays = [ ...new Set(boxes
          .map(el => new Date(el.delivered))
          .map(d => new Intl.DateTimeFormat('en-NZ', {weekday: 'long'}).format(d))
          .sort((a, b) => dayMap[a] - dayMap[b])
        )];
        res.status(200).json(response);
    });
  } catch(err) {
    res.status(400).json({ error: err.toString() });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};
