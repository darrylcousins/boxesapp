/**
 * Algorithm to verify subscriptions
 *
 * Looks for:
 *
 * 1. Date mismatches: If the charge date does not fall 3 days prior to the
 * delivery date then it will be entered here and the dates will need to be
 * corrected before it will pass verification.
 *
 * 2. Orphans: Any subscribed products that are not included in a box
 * subscription as an addon or an extra item then it will show up here. This
 * will need to be resolved before it will pass verification.
 *
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { makeRechargeQuery } from "./helpers.js";
import { makeShopQuery } from "../shopify/helpers.js";
import { matchNumberedString } from "../helpers.js";
import { reconcileGetGroups, reconcileGetGrouped, gatherData } from "./reconcile-charge-group.js";

/**
 * This is doing pretty well but noticed that I can sneak in an extra included
 * item that isn't charged for!
 *
 * But the point here is to find items that are being charged for that will not
 * be included in the order, i.e. protecting the customer from being
 * overcharged. The example I mention here of an extra included item that
 * doesn't have a matching subscription was an artificial construct so
 * "should" never happen anyway.
 *
 * NOTE Also not picking up say a quantity of 2 items subscribed but only a
 * single extra in includes (and swaps?)
 *
 * @function verifyGrouped Performs checks on subscription already group with reconciledGetGrouped
 * The point being to avoid recalling reconcileGetGrouped
 * 
 * See example usage in api/recharge/customer-charge
 */

export const verifyGrouped = async ({
  grouped,
  groupCount,
  collected_rc_subscription_ids,
  broken_subscription_ids,
  price_mismatch,
  date_mismatch,
  count_mismatch,
  price_table,
  orphans,
  io
}) => {
  let currentIdx;
  let dayOfWeek;
  let diff;
  let dayDiff;
  let tempDate;
  try {
    for (const [id, group] of Object.entries(grouped)) {

      // note that in the callee (this file line 380-ish) all missing box
      // subscriptions are loaded as one for the data
      if (group.box) { // XXX if no box then the box subscription comes through as an orphan
        if (!Object.hasOwn(group.box, "updated_at")) {
          const { subscription } = await makeRechargeQuery({
            path: `subscriptions/${group.box.purchase_item_id}`,
            title: `Collecting subscription ${group.box.purchase_item_id}()`,
            io,
          });
          group.box = subscription;
        };
        // in order to manage verification I need the actual subscription here
        const properties = group.box.properties.reduce(
          (acc, curr) => Object.assign(acc, { [`${curr.name}`]: curr.value === null ? "" : curr.value }),
          {});

        const shopify_product_id = group.box.external_product_id.ecommerce;
        const shopify_variant_id = group.box.external_variant_id.ecommerce;

        let variant_price;
        const price_item = price_table.find(el => el.variant_id.toString() === shopify_variant_id.toString());
        if (price_item) {
          variant_price = price_item.price;
        } else {
          try {
            // need to get the actual price of box
            const { variant } = await makeShopQuery({
              path: `variants/${shopify_variant_id}.json`,
              fields: ["price"],
              title: `Get store price for ${group.box.product_title} ${group.box.variant_title}`,
              io,
            });
            variant_price = variant.price;
            price_table.push({ variant_id: shopify_variant_id, price: variant.price });
          } catch(err) {
            _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
          };
        };

        // options here are total_price, unit_price and original price
        // using original_price as protection against future discount addition
        // NOTE this is only for the box itself, and not included items
        if (!isNaN(parseFloat(group.box.original_price))) group.box.price = group.box.original_price;
        if (parseFloat(variant_price) !== parseFloat(group.box.price)) {
          price_mismatch.push({
            subscription_id: group.box.id,
            box_subscription_id: group.box.id,
            box_title: group.box.product_title,
            title: group.box.product_title,
            next_charge_scheduled_at: new Date(group.charge.scheduled_at).toDateString(),
            price: group.box.price, // a string
            variant_price: variant_price,
          });
        };

        const scheduled = new Date(group.charge.scheduled_at);
        const delivered = new Date(properties["Delivery Date"]);
        diff = delivered.getTime() - scheduled.getTime();
        dayDiff = Math. ceil(diff / (1000 * 3600 * 24));

        currentIdx = new Date(Date.parse(properties["Delivery Date"])).getDay() - 4;
        if (currentIdx < 0) currentIdx = currentIdx + 7; // fix to ensure the future
        dayOfWeek = currentIdx % 7;

        // trying to pick up when charge and delivery day has been put out of sync
        if (dayDiff !== 3 || dayOfWeek !== group.box.order_day_of_week) {
          // we can push the whole group because we have already grouped by scheduled_at
          tempDate = new Date(group.box.updated_at);
          tempDate.setMinutes(tempDate.getMinutes() - tempDate.getTimezoneOffset());
          date_mismatch.push({
            message: dayDiff !== 3 ? "Incorrect delivery day" : "Incorrect order day",
            subscription_id: group.box.id,
            title: group.box.product_title,
            next_charge_scheduled_at: new Date(group.charge.scheduled_at).toDateString(),
            deliver_at: properties["Delivery Date"],
            updated_at: tempDate ? tempDate.toISOString().replace(/T/, ' ').replace(/\..+/, '') : "Unknown",
            cancelled_at: group.box.cancelled_at,
            order_day_of_week: group.box.order_day_of_week,
          });
        };

        const included = properties["Including"]
          .split(",").map(el => el.trim())
          .filter(el => el !== "")
          .map(el => matchNumberedString(el))
          .filter(el => el.quantity > 1)
          .map(el => ({ title: el.title, quantity: el.quantity - 1 }));
        // keeping all quantities
        const swapped = properties["Swapped Items"]
          .split(",").map(el => el.trim())
          .filter(el => el !== "")
          .filter(el => el !== "None")
          .map(el => matchNumberedString(el))
          .map(el => ({ title: el.title, quantity: el.quantity - 1 }))
          .filter(el => el.quantity > 0);
        // XXX Saw a single case where an included subscription did not appear here
        const addons = properties["Add on Items"]
          .split(",").map(el => el.trim())
          .filter(el => el !== "")
          .filter(el => el !== "None")
          .map(el => matchNumberedString(el));
        const extras = [ ...included, ...swapped, ...addons, { title: group.box.product_title, quantity: 1 } ];
        //console.log("groupo", group.rc_subscription_ids);
        //console.log("collected", collected_rc_subscription_ids);
        collected_rc_subscription_ids = [ ...collected_rc_subscription_ids, ...group.rc_subscription_ids ];

        // Check quantities of items in rc_subscription_ids against the box lists
        // rc_subscription_ids holds the actual quantity that the subscription has
        // the box itself should always be 1
        // NOTE damn, of course if we haven't been reconciled!!
        const includedItems = ([ ...included, ...swapped, ...addons, { title: group.box.product_title, quantity: 1 } ]);
        for (const rc of group.rc_subscription_ids) {
          // mismatches are picked below and inserted into orphans
          const item = includedItems.find(el => el.title == rc.title);
          if (item && item.quantity !== rc.quantity) {
            count_mismatch.push({
              subscription_id: rc.subscription_id,
              box_subscription_id: group.box.id,
              box_title: group.box.product_title,
              title: rc.title,
              subscribed_quantity: rc.quantity,
              listed_quantity: item.quantity,
              next_charge_scheduled_at: new Date(group.charge.scheduled_at).toDateString(),
            });
          };
          // include the extras if the box is date out of sync
          if (dayDiff !== 3 || dayOfWeek !== group.box.order_day_of_week) {
            if (rc.subscription_id !== group.box.id) {
              date_mismatch.push({
                message: dayDiff !== 3 ? "Incorrect delivery day on parent box" : "Incorrect order day on parent box",
                subscription_id: rc.subscription_id,
                box_subscription_id: group.box.id,
                box_title: group.box.product_title,
                title: rc.title,
                next_charge_scheduled_at: new Date(group.charge.scheduled_at).toDateString(),
                deliver_at: properties["Delivery Date"],
              });
            };
          };
        };

        const extra_titles = extras.map(el => el.title).sort();
        let updated_at = null;
        let next_charge_scheduled_at = null;

        // if missing from extras
        if (group.rc_subscription_ids.length !== extras.length) {
          // finds missing items
          for (const extra of group.rc_subscription_ids.filter(el => {
            return !extra_titles.includes(el.title); // not in extras
          })) {
            if (Object.hasOwn(extra, "updated_at")) {
              tempDate = new Date(extra.updated_at);
              tempDate.setMinutes(tempDate.getMinutes() - tempDate.getTimezoneOffset());
              updated_at = tempDate.toISOString().replace(/T/, ' ').replace(/\..+/, '');
            };
            if (Object.hasOwn(extra, "next_charge_scheduled_at")) {
              next_charge_scheduled_at = new Date(extra.next_charge_scheduled_at).toDateString();
            }
            const thisOrphan = {
              subscription_id: extra.subscription_id,
              box_subscription_id: group.box.id,
              box_title: group.box.product_title,
              title: extra.title,
              next_charge_scheduled_at,
              deliver_at: extra.deliver_at,
              updated_at,
              cancelled_at: null, // data unavailable??? see rc_subscription_ids
            };
            orphans.push(thisOrphan);
          };
        };

        // another method to pick up orphans, this a case where it passes the
        // first check because the item is included in the box, but any duplicates in
        // rc_subscripion_ids is going to be an orphaned item
        const id_array = group.rc_subscription_ids.map(el => el.title);

        // returns array of duplicated elements
        const hasDuplicates = id_array.filter((el, idx) => id_array.indexOf(el) != idx);

        let from_rc = [];
        if (hasDuplicates) {

          hasDuplicates.forEach(duplicate => {
            // need to try and figure the actual broken item if possible
            const temp_item = extras.find(el => el.title === duplicate);

            // try to find one by a quantity mismatch
            const try_one = [];
            let find_one = group.rc_subscription_ids.find(
              el => el.title === duplicate && el.quantity !== temp_item.quantity
            );
            if (find_one) try_one.push(find_one);

            // didn't find one with quantity mismatch
            if (try_one.length === 0) {
              // then try to check for missing properties
              // get all possible
              const possible_duplicates = group.rc_subscription_ids.filter(el => el.title === duplicate).map(el => el.subscription_id);
              
              // check for all line_item properties
              // we want box_subscription_id = group.box.id
              // we want Add on product to = group.box.product_title
              // we want Delivery Date = group.box.properties["Delivery Date"]
              for (const id of possible_duplicates) {
                const possible_item = line_items.find(el => el.purchase_item_id === id);
                if (possible_item) {
                  const props = possible_item.properties.reduce(
                    (acc, curr) => Object.assign(acc, { [`${curr.name}`]: curr.value === null ? "" : curr.value }),
                    {});
                  if (
                      parseInt(props.box_subscription_id) !== group.box.id ||
                      props["Delivery Date"] !== group.box.properties["Delivery Date"] ||
                      props["Add on product to"] !== group.box.product_title
                    ) {
                    find_one = group.rc_subscription_ids.find(el => el.subscription_id === possible_item.purchase_item_id);
                    try_one.push(find_one);
                  };
                  if (try_one.length > 0) break; // found one
                };
              };
              if (try_one.length === 0) {
                // if still don't have a match then grab any one of the possible duplicates
                try_one.push(group.rc_subscription_ids.find(
                  el => el.title === duplicate
                ));
              };
            };

            from_rc = [...from_rc, ...try_one ];
          });
        };
        // push them onto orphans
        from_rc.forEach(el => {
          tempDate = new Date(el.updated_at);
          tempDate.setMinutes(tempDate.getMinutes() - tempDate.getTimezoneOffset());
          try {
            updated_at = tempDate.toISOString().replace(/T/, ' ').replace(/\..+/, '');
          } catch(err) {
            _logger.error({message: "Missing updated_at", level: err.level, stack: err.stack, meta: el })
          };
          orphans.push({
            subscription_id: el.subscription_id,
            title: el.title,
            next_charge_scheduled_at: new Date(el.next_charge_scheduled_at).toDateString(),
            deliver_at: el.deliver_at,
            updated_at,
            cancelled_at: null, // data unavailable??? see rc_subscription_ids
          });
        })
      };
    };
  } catch(err) {
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err})
    throw err; // pass upstream
  } finally {
    if (io) io.emit("message", "Finished verifying box ...");
    return {
      collected_rc_subscription_ids,
      broken_subscription_ids,
      price_mismatch,
      date_mismatch,
      count_mismatch,
      orphans,
      price_table,
    };
  };
};

/*
 * @function verifySubscription
 * @param (object) subscription
 * @param (array) orphans, mutable
 *
 * This is simply to format entries into orphans, does not verify the subscription
 *
 * An example is api/recharge/customer-charge which use reconcileGetGroup and
 * then verifyGrouped, followed by this method, formaOrphanedSubscriptions on the broken ids
 *
 * @returns a result
 *
 */
export const formatOrphanedSubscriptions = async ({ subscriptions, orphans }) => {
  if (subscriptions.some(el =>!isNaN(parseInt(el)))) {
    // we've been passed a list of ids so need to collect the subscriptions
    const query = [
      ["limit", 250 ],
      ["status", "active" ],
      ["ids", subscriptions ],
    ];
    const queryResult = await makeRechargeQuery({
      path: `subscriptions`,
      query,
      title: `Collecting subscriptions as orphans`,
    });
    subscriptions = queryResult.subscriptions;
  };
  try {
    let tempDate;
    for (const subscription of subscriptions) {
      const { product_title: title, next_charge_scheduled_at, updated_at, cancelled_at } = subscription;
      if (`${next_charge_scheduled_at}` !== null) {
        const deliveryProp = subscription.properties.find(el => el.name === "Delivery Date");
        const boxProp = subscription.properties.find(el => el.name === "box_subscription_id");
        const deliveryDate = deliveryProp ? deliveryProp.value : "Missing";
        const boxId = boxProp ? boxProp.value : "Missing";
        tempDate = new Date(updated_at);
        tempDate.setMinutes(tempDate.getMinutes() - tempDate.getTimezoneOffset());
        orphans.push({
          subscription_id: parseInt(subscription.id),
          box_subscription_id: boxId,
          title,
          next_charge_scheduled_at: new Date(next_charge_scheduled_at).toDateString(),
          deliver_at: deliveryDate,
          updated_at: tempDate.toISOString().replace(/T/, ' ').replace(/\..+/, ''),
          box_subscription_id: boxId,
          cancelled_at,
        });
      };
    };
  } catch(err) {
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
    throw err; // pass upstream
  } finally {
    return { orphans };
  };
};

/*
 * @function gatherVerifiedChargeData
 * @param (object) charges As for reconcileGetGroups
 *
 * @returns a result
 *
 * Return data from gatherData of all subscriptions as displayed on customer
 * interface, but also uses verify scripts and returns errors as well as the
 * data.
 *
 * It is used for now when loading customer subscriptions into web interface:
 * api/recharge/customer-charge and customer-charges
 */
export const gatherVerifiedData = async ({ charges, customer, price_table, io }) => {
  let errors = false;
  let data = [];
  try {
    const groups = await reconcileGetGroups({ charges });

    if (io) io.emit("message", "Collected charges ...");

    const erroredIds = [];
    let orphans = [];
    let price_mismatch = [];
    let date_mismatch = [];
    let count_mismatch = [];
    if (!price_table) price_table = [];
    let collected_rc_subscription_ids = [];
    let subscription_ids = [];
    let subscriptions = [];
    const finalGroups = [];

    for (const grouped of groups) {
      for (const [id, group] of Object.entries(grouped)) {
        if (group.box === null && !Object.hasOwn(group, "subscription")) {
          erroredIds.push(id);
          delete grouped[id];
        } else {
          if (!Object.hasOwn(group.box, "updated_at")) {
            // so only a line_item
            subscription_ids.push(id); // to collect actual subscriptions
          } else {
            // a subscription
            group.subscription = group.box;
          };
        };
        if (Object.hasOwn(group.box, "lastOrder") && !Object.hasOwn(group.charge, "lastOrder")) {
          group.charge.lastOrder = group.box.lastOrder;
        };
      };
    };
    if (subscription_ids.length > 0) {
      const fetchSubscriptions = await makeRechargeQuery({
        path: `subscriptions`,
        query: [["ids", subscription_ids]],
        title: "Collecting subscriptions for verify script",
        io,
      });
      if (Object.hasOwn(fetchSubscriptions, "subscriptions")) subscriptions = fetchSubscriptions.subscriptions;
    };

    if (io) io.emit("message", "Verifying boxes ...");

    for (const grouped of groups) {
      for (const id of Object.keys(grouped)) { // could use a set intersection here?
        if (subscription_ids.includes(id)) { // it has been marked as needing a better box
          const box = subscriptions.find(el => el.id === parseInt(id)); // find the subscriptions
          if (box) grouped[id].box = box; // if we find it then replace the line_item box with true subscription
          if (box) grouped[id].subscription = box; // if we find it then replace the line_item box with true subscription
        };
      };
      const verified = await verifyGrouped({
        grouped,
        price_mismatch,
        date_mismatch,
        count_mismatch,
        price_table,
        orphans,
        collected_rc_subscription_ids,
        io
      });

      price_mismatch = verified.price_mismatch;
      date_mismatch = verified.date_mismatch;
      count_mismatch = verified.count_mismatch;
      price_table = verified.price_table;
      orphans = verified.orphans;
      finalGroups.push(grouped);
    };
    if (io) io.emit("progress", "Finished verifying boxes ...");

    const orphaned = await formatOrphanedSubscriptions({ subscriptions: erroredIds, orphans });
    orphans = orphaned.orphans;

    if (io) io.emit("message", "Gathering subscriptions ...");
    for (const grouped of finalGroups) {
      data = await gatherData({ grouped, result: data, io });
    };

    if (orphans.length === 0 && date_mismatch.length === 0 && price_mismatch.length === 0 && count_mismatch.length === 0) {
      errors = false;
    } else {
      errors = { orphans, date_mismatch, price_mismatch, count_mismatch };
      // now insert into faulty_subscriptions table
      const customer_id = Object.hasOwn(customer, "recharge_id") ? customer.recharge_id : customer.id;
      await _mongodb.collection("faulty_subscriptions").updateOne(
        { customer_id },
        { "$set" : {
          customer_id,
          orphans,
          date_mismatch,
          price_mismatch,
          count_mismatch,
          timestamp: new Date(),
        }},
        { "upsert": true }
      );
      if (io) io.emit("error", "Errors found in the subscriptions ...");
    };
  } catch(err) {
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
    throw err; // pass upstream
  } finally {
    return { data, errors };
  };
};

/*
 * @function verifyCustomerSubscriptions
 * @param (object) customer
 *
 * @returns a result
 *
 * If verifying a single charge then use verifySubscriptions and pass in list of ids
 *
 * Another thing is consider pulling "grouped" out of here into another method
 * and avoid the work done in recocileGetGrouped
 */
export const verifyCustomerSubscriptions = async ({ customer, price_table, ids }) => {

  let orphans = [];
  let date_mismatch = [];
  let price_mismatch = [];
  let count_mismatch = [];
  let collected_rc_subscription_ids = [];
  let broken_subscription_ids = []; // the ones without a box
  if (!price_table) price_table = [];

  try {
    const query = [
      ["limit", 250 ],
      ["status", "active" ],
      ["customer_id", `${customer.recharge_id}` ],
    ];
    if (ids) {
      // arrays are handled down the track
      query.push(["ids", ids]);
    };

    const { subscriptions } = await makeRechargeQuery({
      path: `subscriptions`,
      query,
      title: `Collecting subscriptions to verify, (${customer.last_name}`,
    });
    const line_items = subscriptions
      .filter(el => `${el.next_charge_scheduled_at}` !== "null")
      .map(el => {
        return {
          ...el,
          purchase_item_id: el.id,
          title: el.product_title,
          unit_price: el.price.toString(),
        };
    });
    const line_item_groups = {};
    for (const line_item of line_items) {
      if (!Object.hasOwnProperty.call(line_item_groups, line_item.next_charge_scheduled_at)) {
        line_item_groups[line_item.next_charge_scheduled_at] = [];
      };
      line_item_groups[line_item.next_charge_scheduled_at].push(line_item);
    };

    const groupCount = Object.keys(line_item_groups).length;
    let tempDate;

    for (const [scheduled_at, line_items] of Object.entries(line_item_groups)) {

      const grouped = await reconcileGetGrouped({
        charge: {
          line_items,
          customer,
          id: customer.recharge_id, // I guess I just meant anything valid?
          scheduled_at,
        }
      });

      const result = await verifyGrouped({
        grouped,
        groupCount,
        collected_rc_subscription_ids,
        broken_subscription_ids,
        price_mismatch,
        date_mismatch,
        count_mismatch,
        price_table,
        orphans
      });

      // update lists
      collected_rc_subscription_ids = result.collected_rc_subscription_ids;
      broken_subscription_ids = result.broken_subscription_ids; // the ones without a box
      price_mismatch = result.price_mismatch;
      date_mismatch = result.date_mismatch;
      count_mismatch = result.count_mismatch;
      orphans = result.orphans;
      price_table = result.price_table;

    };

    // now collect the other orphans, i.e. not tied to a subscription box
    // provided they have a charge, the others I can certainly delete
    const collected_subscription_ids = collected_rc_subscription_ids.map(el => el.subscription_id);
    // not yet sure why I need to do this??? It's only when we have multiple charges
    /*
    for (const id of broken_subscription_ids) {
      if (collected_subscription_ids.indexOf(id) !== -1) {
        collected_subscription_ids.splice(collected_subscription_ids.indexOf(id), 1);
      };
    };
    */

    // formats broken subscriptions into orphans
    // these will all be box subscriptions that are found broken in reconcileGetGrouped
    const brokenSubscriptions = subscriptions
      .filter(el => `${el.next_charge_scheduled_at}` !== "null")
      .filter(el => collected_subscription_ids.includes(el.id) ? false : true);
    const res = await formatOrphanedSubscriptions( { subscriptions: brokenSubscriptions, orphans });
    orphans = res.orphans;

  } catch(err) {
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
    throw err; // pass upstream
  } finally {
    return ({
      orphans,
      date_mismatch,
      count_mismatch,
      price_mismatch,
      price_table,
    });
  };
};
