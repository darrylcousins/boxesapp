/*
 * @module api/shopify/shopify-box-price.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { makeShopQuery } from "../../lib/shopify/helpers.js";
import { weekdays } from "../../lib/dates.js";

/*
 * @function shopify/shopify-box-price.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {
  const variant_id = parseInt(req.params.variant_id);
  const path = `products/${req.params.product_id}.json`;
  const fields = ["id", "variants"];
  try {
    const result = await makeShopQuery({path, fields, title: "Get price"})
      .then(async ({product}) => {
        let variant;
        if (variant_id < 10) { // just been passed a date.getDay()
          const title = weekdays[variant_id];
          variant = product.variants.find(el => el.title === title);
        } else {
          variant = product.variants.find(el => el.id === variant_id);
        };
        return { price: variant.price };
      });
    res.status(200).json(result);
  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};
