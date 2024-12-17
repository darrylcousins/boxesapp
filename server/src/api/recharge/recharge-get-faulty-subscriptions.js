/*
 * @module api/recharge/recharge-get-faulty-subscriptions.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

/*
 * @function order/get-faulty-subscriptions.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 *
 * Simply return any entries in faulty subscription table, used by admin/customers
 */
export default async (req, res, next) => {

  try {

    const pipeline = [
      { "$lookup": {
        "from": "customers",
        "localField": "customer_id",
        "foreignField": "recharge_id",
        "as": "customer"
      }},
      { "$unwind": "$customer" }
    ];
    const updatesPending = await _mongodb.collection("updates_pending").aggregate(pipeline).toArray();
    const faultySubscriptions = await _mongodb.collection("faulty_subscriptions").aggregate(pipeline).toArray();

    return res.status(200).json({ updatesPending, faultySubscriptions });

  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };

};

