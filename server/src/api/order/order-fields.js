/*
 * @module api/order/order-fields.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

/*
 * @function order/order-fields.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {
  res.status(200).json(orderFields);
};
