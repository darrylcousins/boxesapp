/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { getFilterSettings } from "./settings.js";
import { getOrderCount } from "./orders.js";
import { weekdays } from "./dates.js";

/*
 * Helper method to set up default settings for a day
 * Used by add-box, duplicate-box, and duplicate-boxes
 */
/**
 * Get list of delivery days for a box container filtered using cutoff and limit filters
 * @function getDeliveryDays
 */
export const getDefaultBoxSettings = async (delivered) => {
  const date = new Date(delivered);
  const weekday = weekdays[date.getDay()];

  const defaultSetting = await _mongodb.collection("settings").findOne({ handle: "default-cutoff" });
  let cutoff = 5;
  if (defaultSetting) cutoff = parseFloat(defaultSetting.value);

  // try to find existing settings
  let cutOffSetting = await _mongodb.collection("settings").findOne( { handle: "box-cutoff", weekday });
  let limitSetting = await _mongodb.collection("settings").findOne( { handle: "box-limit", weekday });

  if (cutOffSetting && limitSetting) return { cutoff: cutOffSetting, limit: limitSetting };

  cutOffSetting = {
    handle: "box-cutoff",
    tag: "Box Cutoff",
    weekday,
    value: cutoff
  };
  limitSetting = {
    handle: "box-limit",
    tag: "Box Limit",
    weekday,
    value: 0 // default to no order limit
  };
  const result = await _mongodb.collection("settings").insertMany([ cutOffSetting, limitSetting ]);

  return { cutoff: cutOffSetting, limit: limitSetting };
};

/*
 * Helper method for filtering boxes
 */
/**
 * Get list of delivery days for a box container filtered using cutoff and limit filters
 * @function getDeliveryDays
 */
export const getDeliveryDays = async (db, product_id, weekday) => {

  // every use of weekday has no interest in filters nor in getting current boxes
  // e.g. change-box-modal
  let doFilters = false;
  if (typeof weekday === "undefined") {
    doFilters = true;
  };

  const pipeline = [
    { "$match": { 
      active: true,
      shopify_product_id: product_id,
    }},
    { "$project": {
      deliverDate: {
        $dateFromString: {dateString: "$delivered", timezone: "Pacific/Auckland"}
      },
      delivered: "$delivered",
    }},
  ];
  if (doFilters) {
    pipeline.push(
      { "$match": { deliverDate: { "$gte": new Date() } } },
    );
  };
  pipeline.push(
    { "$project": {
      delivered: "$delivered",
      deliverDate: "$deliverDate",
      deliverDay: { "$dayOfWeek": "$deliverDate" }, // returns monday 1, sunday 7
    }}
  );

  try {
    let dates = await _mongodb.collection("boxes").aggregate(pipeline).toArray();

    let filters = {};
    let counts = null;

    if (typeof weekday === "undefined") {
      filters = await getFilterSettings();
      counts = await getOrderCount();
    } else {
      let dayIdx = weekdays.map(el => el.toLowerCase()).indexOf(weekday);
      // sunday 0 saturday 6
      dayIdx = dayIdx === 0 ? 7 : dayIdx;
      // but dayOfWeek (deliveryDay) returns monday 1 sunday 7
      if (dayIdx >= 0) {
        dates = dates.filter(el => el.deliverDay === dayIdx);
      };
    };

    const now = new Date();
    // now filter the array accounting for limits
    // Shape of el:
    // deliveryDay: integer
    // delivered: dateString
    // deliverDate: dateObject
    const finalDates = dates.map(el => {
      if (!el) return null;
      const filter = filters[el.deliverDay];
      const count = counts && el.delivered in counts ? counts[el.delivered] : 0;
      // a limit of zero means no limit at all
      if (filter) {
        if (filter.hasOwnProperty("limit") && filter.limit > 0) {
          if (count >= filter.limit) return null;
        };
        if (filter.hasOwnProperty("cutoff") && filter.cutoff > Math.abs(el.deliverDate - now) / 36e5) {
          return null;
        };
      };
      return el.delivered;
    }).filter(el => el !== null);

    return finalDates;

  } catch(err) {
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err})
  };
};



/*
 * Helper method to get a tag for a produc title
 * This is used by picking/packing data when shop administrator makes changes
 * to boxes after orders have been placed meaning that the product and tag may
  * not be found in the box
 */
export const getProductDetails = async (product_title) => {
  let searchArray = product_title;
  if (typeof product_title === "string") {
    searchArray = [ product_title ];
  };
  const pipeline = [
    { "$unwind": "$includedProducts" },
    { "$unwind": "$addOnProducts" },
    { "$project": {
      shopify_title: "$shopify_title",
      included: "$includedProducts.shopify_title",
      included_price: "$includedProducts.shopify_price",
      included_product_id: "$includedProducts.shopify_product_id",
      included_tag: "$includedProducts.shopify_tag",
      addon: "$addOnProducts.shopify_title",
      addon_price: "$addOnProducts.shopify_price",
      addon_product_id: "$addOnProducts.shopify_product_id",
      addon_tag: "$addOnProducts.shopify_tag",
    }},
    //{ "$match": { "$or": [ {included: product_title}, {addon: product_title} ] }},
    { "$match": { "$or": 
      [
        {included: { "$in" : searchArray}},
        {addon: { "$in" : searchArray}},
      ] }},
    { "$project": {
      title: {
        "$cond": {
          if: { "$eq": [ "$included", product_title ] },
          then: "$included",
          else: "$addon"
      }},
      price: {
        "$cond": {
          if: { "$eq": [ "$included", product_title ] },
          then: "$included_price",
          else: "$addon_price"
      }},
      shopify_product_id: {
        "$cond": {
          if: { "$eq": [ "$included", product_title ] },
          then: "$included_product_id",
          else: "$addon_product_id"
      }},
      tag: {
        "$cond": {
          if: { "$eq": [ "$included", product_title ] },
          then: "$included_tag",
          else: "$addon_tag"
      }},
    }},
    { "$group": { "_id": "$title", "doc" : {"$first": "$$ROOT"}} },
    { "$replaceRoot": { "newRoot": "$doc"} },
  ];

  const result = await _mongodb.collection("boxes").aggregate(pipeline).toArray();
  if (typeof product_title === "string") {
    return result[0];
  };
  return result;
};
