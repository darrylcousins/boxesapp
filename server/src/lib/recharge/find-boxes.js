/*
 * @module lib/recharge/find-boxes.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

/*
 * @function findBoxes
 * @returns { fetchBox, previousBox, hasNextBox }
 */
export default async ({ days, nextDeliveryDate, shopify_product_id }) => {
  let fetchBox = null;
  let previousBox = null;
  let hasNextBox = false;
  let delivered = new Date(nextDeliveryDate);
  let dayOfWeek = delivered.getDay();
  if (dayOfWeek === 0) dayOfWeek = 7; // Sunday fix to match with dayOfWeek returned from mongo

  const pipeline = [
    { "$match": { 
      active: true,
      shopify_product_id,
    }},
    { "$project": {
      deliverDate: {
        $dateFromString: {dateString: "$delivered", timezone: "Pacific/Auckland"}
      },
      delivered: "$delivered",
      deliverDay: { "$dayOfWeek": { $dateFromString: {dateString: "$delivered", timezone: "Pacific/Auckland"} }},
    }},
    { "$match": { deliverDay: dayOfWeek } },
    { "$project": {
      delivered: "$delivered",
      deliverDate: "$deliverDate",
      deliverDay: "$deliverDay",
    }},
  ];

  let dates = await _mongodb.collection("boxes").aggregate(pipeline).toArray();
  dates = dates.map(el => el.delivered).reverse();

  // if our date is in the array then we have the next box
  if (dates.indexOf(delivered.toDateString()) !== -1) hasNextBox = true;

  // if not then we need to dial back the deliver date until we find a box
  if (!hasNextBox) {

    // to avoid dropping into an infinite loop first check that our date is at
    // least greater than the earliest date of the list
    if (new Date(dates[dates.length - 1]).getTime() < delivered.getTime()) {
      while (dates.indexOf(delivered.toDateString()) === -1) {
        delivered.setDate(delivered.getDate() - days);
      };
    };
  };

  // first find if the targeted date is in the list by splicing the list to that date
  for (const d of dates) {
    if (!fetchBox) {
      if (d === delivered.toDateString()) { // do we have the upcoming box? i.e. nextBox
        fetchBox = await _mongodb.collection("boxes").findOne({delivered: d, shopify_product_id});
        delivered.setDate(delivered.getDate() - days); // do we have the next box?
      };
    } else if (!previousBox) {
      if (d === delivered.toDateString()) { // do we have the upcoming box? i.e. nextBox
        previousBox = await _mongodb.collection("boxes").findOne({delivered: d, shopify_product_id});
        delivered.setDate(delivered.getDate() - days); // do we have the next box?
      };
    };
  };

  // create a mock box
  if (!fetchBox) {
    fetchBox = {
      shopify_title: "",
      includedProducts: [],
      addOnProducts: [],
    };
  };

  return {
    fetchBox,
    previousBox,
    hasNextBox
  };
};
