/*
 * @module api/recharge/get-subscriptions-by-date
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

const isValidDateString = (str) => {
  const d = new Date(Date.parse(str));
  return d instanceof Date && !isNaN(d);
};
/*
 * @function recharge/get-subscriptions-by-date
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {
  const collection = _mongodb.collection("customers");
  const date = req.query.date;
  if (!isValidDateString(date)) {
    return res.status(200).json({ error: "Invalid Date" });
  };
  try {
    const result = await collection.find({
      "charge_list": {
        $elemMatch: {
          $elemMatch:{
            $in:[date]
        }}}}).toArray();
    if (result) {
      return res.status(200).json(result);
    } else {
      return res.status(200).json([]);
    };
  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};


