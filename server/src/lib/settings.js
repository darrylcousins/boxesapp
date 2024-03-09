/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { weekdays } from "./dates.js";
/**
 * Helper method to collect appropiate settings used to filter boxes
 * These are namely the cutoff hours, the box count limit, and number of orders received
 * The final result looks something like:
 * { Thursday: { limit: 1, cutoff: 37.5, count: 56 },
 *   Tuesday: { limit: 1, cutoff: 16 },
 *   Saturday: { limit: 0, cutoff: 37.5, count: 12 }
 * }
 *
 * @function getFilterSettings
 */
export const getFilterSettings = async () => {
  // should be able to match weekday
  const collection = _mongodb.collection("settings");
  const pipeline = [
    { "$match": { "$or": [ { handle: "box-limit" }, { handle: "box-cutoff" } ] }},
    { "$group": {
      "_id": "$handle",
      "values": { "$push": { "weekday": "$weekday", "value": "$value" }},
    }},
  ];

  try {
    const limit = await collection.aggregate(pipeline).toArray();
    //for (const setting of limit) console.log(setting._id, setting.values);

    const limitFinal = limit.reduce((res, curr) => {
      const key = curr._id.split("-")[1];
      for (const o of curr.values) {
        const wkey = weekdays.indexOf(o.weekday);
        // const key = o.weekday;
        if (!(wkey in res)) res[wkey] = {};
        res[wkey][key] = o.value;
      };
      return res;
    }, {});

    return limitFinal;
  } catch(err) {
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err})
  };
};


