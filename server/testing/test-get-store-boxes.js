/*
 * @module api/shopify/get-store-boxes
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { MongoClient, ObjectID } from "mongodb";
import { Shopify } from "../src/lib/shopify/index.js";
import { getMongo } from "../src/lib/mongo/mongo.js";
import { queryStoreGraphQL } from "../src/lib/shopify/helpers.js";
import { makeRechargeQuery } from "../src/lib/recharge/helpers.js";

global._filename = (_meta) => _meta.url.split("/").pop();
dotenv.config({ path: path.resolve(_filename(import.meta), '../.env') });
global._logger = console;
global._mongodb;
_logger.notice = (e) => console.log(e);

/**
 * Simple template for node script
 */

const run = async () => {

  //global._mongodb = await getMongoConnection(); // if mongo connection required
  // for winstonLogger to store to mongo we need a client in the process
  // regardless whether it is actually used in the script
  const { mongo: mongodb, client: dbClient } = await getMongo();
  global._mongodb = mongodb;

  await Shopify.initialize(); // if shopify query required

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
            variants (first: 5) {
              nodes {
                id
                title
                price
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
          boxes.push({
            id: parseInt(node.id.split("/").pop()),
            title: node.title,
            variants: node.variants.nodes.map(el => {
                return {
                  id: parseInt(el.id.split("/").pop()),
                  title: el.title,
                  price: el.price,
                  order_day_of_week: getOrderDayOfWeek(el.title)
                };
              }),
            plans: node.sellingPlanGroups.nodes[0].sellingPlans.nodes.map(el => {
                return {
                  id: parseInt(el.id.split("/").pop()),
                  name: el.name.charAt(0).toUpperCase() + el.name.substring(1).toLowerCase(),
                };
              }),
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
            };
          });
          for (const plan of box.plans) {
            const recharge_plan = recharge_plans.find(el => el.title === plan.name.toLowerCase());
            plan.recharge_id = recharge_plan.id;
          };
        };
        return boxes;
      });
    console.log(JSON.stringify(result, null, 2));

  } catch(e) {
    console.error(e);
  } finally {
    await dbClient.close();
    process.emit('SIGINT'); // will close mongo connection
  };
};

const main = async () => {
  await run();
  process.exit();
};

main().catch(console.error);




