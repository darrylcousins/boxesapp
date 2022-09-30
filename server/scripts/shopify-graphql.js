import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { MongoClient, ObjectID } from "mongodb";
import { Shopify } from "../src/lib/shopify/index.js";
import { queryStoreGraphQL } from "../src/lib/shopify/helpers.js";
import { getMongoConnection, MongoStore } from "../src/lib/mongo/mongo.js";

global._filename = (_meta) => _meta.url.split("/").pop();
dotenv.config({ path: path.resolve(_filename(import.meta), '../.env') });
global._logger = console;
global._mongodb;
_logger.notice = (e) => console.log(e);

/**
 * Simple template for node script
 */

const run = async () => {

  global._mongodb = await getMongoConnection(); // if mongo connection required
  await Shopify.initialize(); // if shopify query required
  //const id = 7605212807318;
  const id = 6166841393302;
  const body = `{
    product (id: "gid://shopify/Product/${id}") {
      id
      handle
      tags
      title
      sellingPlanGroupCount
      productType
      sellingPlanGroups (first: 1) {
        nodes {
          options
        }
      }
      variants (first: 1) {
        nodes {
          id
          price
        }
      }
    }
  }`;
  const result = await queryStoreGraphQL({ body });

  try {
    const result = await queryStoreGraphQL({ body });
    console.log(result);
    console.log(JSON.stringify(result, null, 2));
    //console.log(result.data.products.edges);

  } catch(e) {
    console.error(e);
  } finally {
    process.emit('SIGINT'); // will close mongo connection
  };
};

const main = async () => {
  await run();
};

main().catch(console.error);





