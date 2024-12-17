/*
 * @module api/shopify/get-store-boxes
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { queryStoreGraphQL } from "../../lib/shopify/helpers.js";
import { makeRechargeQuery } from "../../lib/recharge/helpers.js";

/*
 * @function box/get-store-boxes.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 *
 * Get all container boxes with variants and selling plans
 */
export default async (req, res, next) => {

  try {
    const body = `{
      products (first: 10, query: "product_type:'Container Box'") {
        edges {
          node {
            id
            title
            sellingPlanGroups (first: 1) {
              nodes {
                sellingPlans (first: 3) {
                  nodes {
                    id
                    name
                  }
                }
              }
            }
            variants (first: 10) {
              nodes {
                id
                title
                price
                sku
              }
            }
          }
        }
      }
    }`;

    const getOrderDayOfWeek = (weekday) => {
      /* Match "order_day_of_week" to 3 days before "Delivery Date"
       * recharges uses Monday = 0
       * So for Tuesday delivery we need order day saturday 5
       */
      return ["thursday", "friday", "saturday", "sunday", "monday", "tuesday", "wednesday"].indexOf(weekday.toLowerCase());
    };

    const result = await queryStoreGraphQL({ body })
      .then(async (result) => {
        if (!Object.hasOwnProperty.call(result, "data")) {
          return null; // throw?
        }
        const { data } = result;
        if (data.products.length === 0) return null;
        const boxes = [];
        for (const { node } of data.products.edges) {
          // xmas boxes and such like
          if (!Object.hasOwnProperty.call(node, "sellingPlanGroups") || node.sellingPlanGroups.length === 0) continue;
          let plans;
          try {
            plans = node.sellingPlanGroups.nodes[0].sellingPlans.nodes.map(el => {
                return {
                  id: parseInt(el.id.split("/").pop()),
                  name: el.name.charAt(0).toUpperCase() + el.name.substring(1).toLowerCase(),
                };
            });
          } catch(err) {
            //_logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
            continue;
          };
          boxes.push({
            id: parseInt(node.id.split("/").pop()),
            title: node.title,
            variants: node.variants.nodes.map(el => {
                return {
                  id: parseInt(el.id.split("/").pop()),
                  title: el.title,
                  price: el.price,
                  sku: el.sku,
                  order_day_of_week: getOrderDayOfWeek(el.title)
                };
              }),
            plans,
          });
        };
        for (const box of boxes) {
          const { plans } = await makeRechargeQuery({
            path: `plans`,
            query: [
              ["external_product_id", box.id ],
            ]
          });
          // find each plan
          const recharge_plans = plans.map(el => {
            return {
              id: el.id,
              product_id: el.external_product_id.ecommerce,
              title: el.title.toLowerCase(),
              frequency: el.subscription_preferences.order_interval_frequency,
              unit: el.subscription_preferences.interval_unit,
            };
          });
          for (const plan of box.plans) {
            const recharge_plan = recharge_plans.find(el => el.title === plan.name.toLowerCase());
            plan.recharge_id = recharge_plan.id;
            plan.frequency = recharge_plan.frequency;
            plan.unit = recharge_plan.unit;
          };
        };
        return boxes;
      });

    res.status(200).json({ boxes: result });

  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };

};

