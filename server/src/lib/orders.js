/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { ObjectID } from "mongodb";
import { LABELKEYS, NODELIVER_STRING } from "./constants.js";
import { getPickingData, getPackingData } from "./picking.js";
import { matchNumberedString } from "./helpers.js";

/*
 * function getQueryFilters
 *
 * Pick up filters from query string
 */
export const getQueryFilters = (req, query) => {
  // get query parameters
  let filter_field = null;
  let filter_value = null;
  if (Object.keys(req.query).length) {
    if (Object.hasOwnProperty.call(req.query, 'filter_field')) {
      filter_field = req.query.filter_field;
    };
    if (Object.hasOwnProperty.call(req.query, 'filter_value')) {
      const testDate = new Date(parseInt(req.query.filter_value));
      filter_value = (!Boolean(testDate)) ? req.query.filter_value : testDate.toDateString();
    };
  };
  if (filter_field && filter_value) {
    query[filter_field] = filter_value;
  };
  return query;
};

/**
 * Helper method to collect order count by delivery date
 * @function getOrderCount
 */
export const getOrderCount = async () => {
  const collection = _mongodb.collection("orders");
  const pipeline = [
    // don't match no delivery date
    { "$match": { delivered: { "$ne": "No delivery date" } } },
    // get the date object
    { "$project": {
      deliverDate: {
        $dateFromString: {dateString: "$delivered", timezone: "Pacific/Auckland"}
      },
      delivered: "$delivered",
    }},
    // match only orders later than now
    { "$match": { deliverDate: { "$gte": new Date() } } },
    // collect sum of unique delivery dates
    { "$group": {
      "_id": {
        "delivered": "$delivered"
      },
      "count": { "$sum": 1 } // count each
    }},
    // Sum all occurrences
    { "$group": {
        "_id": "$_id.delivered",
      "count": { "$sum": "$count" },
    }},
  ];

  try {
    const orders = await collection.aggregate(pipeline).toArray();
    const ordersFinal = orders.reduce((res, curr) => {
      res[curr._id] = curr.count;
      return res;
    }, {});
    return ordersFinal;
  } catch(err) {
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err})
  };
};

/**
 * getSettings
 * collect the product tags and custom box id
 * @returns {object}
 */
export const getSettings = async () => {

  try {
    const pipeline = [
      { "$match": { 
        "handle": { "$in": ["product-tags", "custom-box-id"] },
      }},
      { "$group": { 
        "_id": null,
        "data": {
          "$push": { "k": "$handle", "v": "$value" }
        },
      }},
      { "$replaceRoot": {
        "newRoot": { "$arrayToObject": "$data" }
      }}
    ];
    const result = await _mongodb.collection("settings").aggregate(pipeline).toArray();
    return result[0];
    
  } catch(err) {
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};

/**
 * collect the boxes for this delivery day
 * collect the count of orders for each box
 * collate the products in each box by tag
 * collate the included breads along with their count
 * and then some meta data
 *
 */
export const collatePickingData = async (options) => {

  const {req, deliveryDay, query, settings} = options;

  const custom_box_id = parseInt(settings["custom-box-id"]);
  const tags = settings["product-tags"].split(",").sort().reverse();
  const final = tags.reduce((accumulator, value) => {
    return {...accumulator, [value]: {}};
  }, {});
  const orders = await getPickingData(query);

  const columns = ["including", "addons", "custom", "swaps", "total"];
  const column_data = columns.reduce((acc, val) => {
    return {...acc, [val]: 0};
  }, {});

  let count = 1;
  for (const order of orders) {

    for (const column of ["including", "addons", "swaps"]) {
      for (const product of order[column]) {
        const { title: name, quantity: count} = matchNumberedString(product);
        if (name === "None") continue;
        const key = (order.product_id === custom_box_id) ? "custom" : column;
        const tag = `${order.products[name]}`;

        if (!Object.hasOwnProperty.call(final, tag)) {
          final[tag] = {}; // allowing incorrect tags e.g. null 
        };
        if (!Object.hasOwnProperty.call(final[tag], name)) {
          final[tag][name] = {...column_data};
        };
        final[tag][name][key] += count;
        final[tag][name]["total"] += count;
      };
    };
    count++;
  };

  // collect keys to do the fixing for old subscription orders
  const fixKeys = {};
  // sort the products
  for (const [tag, value] of Object.entries(final)) {
    // fix old subscriptions
    if (tag !== "undefined"){
      fixKeys[tag] = Object.keys(value);
    };
    final[tag] = Object.keys(value)
      .sort()
      .reduce((accumulator, tag) => {
        accumulator[tag] = value[tag];
        return accumulator;
      }, {});
  };

  // Damn the old subscriptions not matched to boxes and so ending up
  // with an undefined tag with items that we try to match here
  if (Object.hasOwnProperty.call(final, "undefined")) {
    const untaggedItems = { ...final.undefined };

    delete final.undefined;

    for (const [key, value] of Object.entries(untaggedItems)) {
      for (const [tag, values] of Object.entries(final)) {
        const found = Object.entries(values).find(([k, v]) => k === key);
        //const found = Object.keys(list).find(k => k === key);
        if (found) {
          for (const group of ["including", "addons", "swaps", "custom", "total"]) {
            final[tag][key][group] += untaggedItems[key][group];
          };
          delete untaggedItems[key];
        };
      };
    };
    final.Untagged = { ...untaggedItems };
  };

  return final;
};

/**
 * collect the boxes for this delivery day
 * collect the count of orders for each box
 * collate the products in each box by tag
 * collate the included breads along with their count
 * and then some meta data
 *
 */
export const collatePackingData = async (options) => {

  const {deliveryDay, query, settings} = options;

  const custom_box_id = parseInt(settings["custom-box-id"]);
  const tags = settings["product-tags"].split(",").sort().reverse();
  const boxes = await getPackingData(query);

  boxes.sort((a, b) => {
    return (Object.keys(a.products).length > Object.keys(b.products).length) ? 1 : -1;
  });

  const data = {"boxes": {}}
  for (const box of boxes) {
    // skip the custom box and any without orders
    if (box.orders > 0 && box._id !== custom_box_id) {
      // reshape data
      data.boxes[box.title] = {"products": []};
      const uniqueTags = [...new Set(Object.values(box.products))];
      for (const tagName of tags) {
        if (uniqueTags.includes(tagName)) {
          for (const [product, tag] of Object.entries(box.products)) {
            if (tag === tagName) {
              data.boxes[box.title].products.push(product);
            };
          };
          data.boxes[box.title].products.push(null);
        };
      };
      // pop off the last null
      data.boxes[box.title].products.pop();
      data.boxes[box.title]["count"] = box.orders;
    };
  };
  const custom_box_orders = boxes.find(el => el._id === custom_box_id);

  data["custom-boxes"] = custom_box_orders ? custom_box_orders.orders : 0;
  data["total-boxes"] = boxes.map(el => el.orders).reduce((sum, el) => sum + el, 0);

  return data;
};

/*
 * function processOrderJson
 * expects a string to search on
 */
export const processOrderJson = async (json) => {
  // process order as received from Shopify api
  const {
    id,
    order_number,
    subtotal_price,
    contact_email,
    shipping_address,
    note,
    line_items,
    customer
  } = json;

  // XXX Still need to figure out how to handle multiple boxes in a single order
  // obvious option will be to make up an array of matching line items and then
  // figure out what items belong to which using line_item.properties
  const boxIds = await _mongodb.collection("boxes").distinct("shopify_product_id");
  let boxProduct = null;
  for (const line_item of line_items) {
    if (boxIds.includes(line_item.product_id)) {
      // a container box
      boxProduct = line_item;
      break;
    };
  };
  // if not boxProduct we need to give up and return

  let cust_details = {};
  // TODO destructuring within if else to const didn't work???
  if (shipping_address) {
    cust_details.name = shipping_address.name;
    cust_details.first_name = shipping_address.first_name;
    cust_details.last_name = shipping_address.last_name;
    cust_details.address1 = shipping_address.address1;
    cust_details.address2 = shipping_address.address2;
    cust_details.city = shipping_address.city;
    cust_details.zip = shipping_address.zip;
    cust_details.phone = shipping_address.phone;
  } else {
    cust_details.name = customer.default_address.name;
    cust_details.first_name = customer.first_name;
    cust_details.last_name = customer.last_name;
    cust_details.address1 = customer.default_address.address1;
    cust_details.address2 = customer.default_address.address2;
    cust_details.city = customer.default_address.city;
    cust_details.zip = customer.default_address.zip;
    cust_details.phone = customer.default_address.phone;
  }
  cust_details.shopify_customer_id = customer.id;
  // TODO destructuring within if else to const didn't work???
  const {
    name,
    first_name,
    last_name,
    address1,
    address2,
    city,
    zip,
    phone,
    shopify_customer_id
  } = cust_details;

  // could put from here in a loop over the matching boxProduct array

  const properties = boxProduct.properties;
  const [deliveryKey, includingKey, addonKey, removedKey, swappedKey, productAddOnTo, subscriptionKey] = LABELKEYS;
  var attributes = properties.reduce(
    (acc, curr) => Object.assign(acc, { [`${curr.name}`]: curr.value }),
    {});

  let delivered = NODELIVER_STRING;
  let addons = [];
  let including = [];
  let removed = [];
  let swaps = [];

  if (deliveryKey in attributes) delivered = attributes[deliveryKey];
  if (includingKey in attributes) including = attributes[includingKey]
    .split(',').map(el => el.trim()).filter(el => el !== '');
  if (addonKey in attributes) addons = attributes[addonKey]
    .split(',').map(el => el.trim()).filter(el => el !== '');
  if (removedKey in attributes) removed = attributes[removedKey]
    .split(',').map(el => el.trim()).filter(el => el !== '');
  if (swappedKey in attributes) swaps = attributes[swappedKey]
    .split(',').map(el => el.trim()).filter(el => el !== '');

  const pickup = delivered;
  const inserted = new Date().toDateString();

  const order = {
    _id: new ObjectID(),
    shopify_order_id: parseInt(id),
    shopify_customer_id,
    order_number: order_number.toString(),
    delivered,
    pickup,
    inserted,
    total_price: subtotal_price,
    contact_email,
    name,
    first_name,
    last_name,
    phone,
    note,
    including,
    addons,
    removed,
    swaps,
  };

  // collect shipping and source
  const shipping_line = json.shipping_lines[0];
  const {carrier_identifier, code, source, title, price} = shipping_line;
  order.source = {
    name: "Shopify",
    source,
    identifier: json.source_identifier,
    type: json.source_name,
  };
  order.shipping = {carrier_identifier, code, source, title, price};

  if (parseFloat(price) === 0) {
    order.address1 = "Farm Pickup";
    order.address2 = "";
    order.city = "";
    order.zip = "";
  } else {
    order.address1 = address1;
    order.address2 = address2;
    order.city = city;
    order.zip = zip;
  };

  // first order has source of 'web' and therefore correct delivered will be recordedi
  order.variant_title = boxProduct.variant_title;
  order.variant_name = boxProduct.name;
  order.variant_id = boxProduct.variant_id;
  order.product_title = boxProduct.title;
  order.product_id = boxProduct.product_id;

  return order;
};

