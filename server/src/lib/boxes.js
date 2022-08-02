/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { getFilterSettings } from "./settings.js";
import { getOrderCount } from "./orders.js";
/*
 * Helper method for filtering boxes
 */
/**
 * Get list of delivery days for a box container filtered using cutoff and limit filters
 * @function getDeliveryDays
 */
export const getDeliveryDays = async (db, product_id) => {

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
    { "$match": { deliverDate: { "$gte": new Date() } } },
    { "$project": {
      delivered: "$delivered",
      deliverDate: "$deliverDate",
      deliverDay: { "$dayOfWeek": "$deliverDate" },
    }}
  ];

  try {
    const filters = await getFilterSettings();
    const counts = await getOrderCount();
    const dates = await _mongodb.collection("boxes").aggregate(pipeline).toArray();

    const now = new Date();
    // now filter the array accounting for limits
    const finalDates = dates.map(el => {
      const filter = filters[el.deliverDay];
      const count = el.delivered in counts ? counts[el.delivered] : 0;
      // a limit of zero means no limit at all
      if (filter.limit > 0) {
        if (count >= filter.limit) return null;
      };
      if (filter.cutoff > Math.abs(el.deliverDate - now) / 36e5) {
        return null;
      };
      return el.delivered;
    }).filter(el => el !== null);

    return finalDates;

  } catch(err) {
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err})
  };
};



