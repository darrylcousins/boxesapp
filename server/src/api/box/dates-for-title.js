/*
 * @module api/box/date-for-title.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

/*
 * @function box/dates-for-title.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {
  // get current box by selected date and shopify product id
  const collection = _mongodb.collection("boxes");
  // can also be the shopify_product_id
  const product_title = req.params.product_title;
  const product_id = parseInt(product_title);
  const now = new Date();
  const query = { active: true };
  if (isNaN(product_id)) {
    query.shopify_title = product_title;
  } else {
    query.shopify_product_id = product_id;
  };
  try {
    let boxes = await collection
      .find(query)
      .project({delivered: 1}).toArray();

    boxes = boxes.map(el => new Date(Date.parse(el.delivered))).sort((d1, d2) => {
      if (d1 < d2) return -1;
      if (d1 > d2) return 1;
      return 0;
    }).filter(el => el > now);

    res.status(200).json(boxes.map(el => el.toDateString()));
  } catch(err) {
    res.status(400).json({ error: err.toString() });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};


