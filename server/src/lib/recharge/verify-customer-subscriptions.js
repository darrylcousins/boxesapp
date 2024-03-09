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
import { reconcileGetGrouped, gatherData } from "./reconcile-charge-group.js";

/**
 * This is doing pretty well but noticed that I can sneak in an extra included
 * item that isn't charged for!
 *
 * But the point here is to find items that are being charged for that will not
 * be included in the order, i.e. protecting the customer from being
 * overcharged. The example I mention here of an extra included item that
 * doesn't have a matching subscription was an artificial construct so
 * "should" never happen anyway.
 */

/*
 * @function verifyCustomerSubscriptions
 * @param (object) customer
 *
 * @returns a resutl
 */
export const verifyCustomerSubscriptions = async ({ customer, box_price_table }) => {

  let orphans = []; // collect as rc_subscription objects
  let date_mismatch = []; // collected as groups currently
  let price_mismatch = [];

  let collected_rc_subscription_ids = [];
  let tempDate;

  try {
    const { subscriptions } = await makeRechargeQuery({
      path: `subscriptions`,
      query: [
        ["limit", 250 ],
        ["customer_id", `${customer.recharge_id}` ],
      ],
      title: "Clean subscriptions",
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
    // gut feeling here is I need to group the line_items by
    // next_charge_scheduled_at so that I can add next_scheduled_at to the
    // stub charge I create
    const line_item_groups = {};
    for (const line_item of line_items) {
      if (!Object.hasOwnProperty.call(line_item_groups, line_item.next_charge_scheduled_at)) {
        line_item_groups[line_item.next_charge_scheduled_at] = [];
      };
      line_item_groups[line_item.next_charge_scheduled_at].push(line_item);
    };

    for (const [scheduled_at, line_items] of Object.entries(line_item_groups)) {

      const grouped = await reconcileGetGrouped({
        charge: {
          line_items,
          customer,
          id: customer.recharge_id,
          scheduled_at,
        }
      });

      let currentIdx;
      let dayOfWeek;
      let diff;
      let dayDiff;
      for (const [id, group] of Object.entries(grouped)) {
        console.log(id, Object.keys(group));
        //console.log(group.box);
        // rc_subscription_ids, all grouped to the box
        // need to compare the count to actual extras
        // from properties figure out which extra subscriptions we need, or not.
        if (group.box) { // XXX what to do here if no box
          const properties = group.box.properties.reduce(
            (acc, curr) => Object.assign(acc, { [`${curr.name}`]: curr.value === null ? "" : curr.value }),
            {});

          const shopify_product_id = group.box.external_product_id.ecommerce;
          const shopify_variant_id = group.box.external_variant_id.ecommerce;
          console.log(properties);

          let variant_price;
          const price_item = box_price_table.find(el => el.variant_id === shopify_variant_id);
          if (price_item) {
            variant_price = price_item.price;
          } else {
            try {
              // need to get the actual price of box
              const { variant } = await makeShopQuery({
                path: `variants/${shopify_variant_id}.json`,
                fields: ["price"],
                title: "Get price",
              });
              variant_price = variant.price;
              box_price_table.push({ variant_id: shopify_variant_id, price: variant.price });
            } catch(err) {
              _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
            };
          };

          if (parseInt(variant_price) !== parseInt(group.box.price)) {
            price_mismatch.push({
              subscription_id: group.box.id,
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
            const d = date.toISOString().replace(/T/, ' ').replace(/\..+/, '');
            date_mismatch.push({
              message: dayDiff !== 3 ? "Incorrect delivery day" : "Incorrect order day",
              subscription_id: group.box.id,
              title: group.box.product_title,
              next_charge_scheduled_at: new Date(group.charge.scheduled_at).toDateString(),
              delivery_at: properties["Delivery Date"],
              updated_at: tempDate.toISOString().replace(/T/, ' ').replace(/\..+/, ''),
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
          collected_rc_subscription_ids = [ ...collected_rc_subscription_ids, ...group.rc_subscription_ids ];

          const extra_titles = extras.map(el => el.title).sort();

          // if missing from extras
          if (group.rc_subscription_ids.length !== extras.length) {
            // finds missing items
            for (const extra of group.rc_subscription_ids.filter(el => {
              return extra_titles.includes(el.title) ? false : true;
            })) {
              tempDate = new Date(extra.updated_at);
              tempDate.setMinutes(tempDate.getMinutes() - tempDate.getTimezoneOffset());
              orphans.push({
                subscription_id: extra.subscription_id,
                box_subscription_id: properties.box_subscription_id,
                title: extra.title,
                next_charge_scheduled_at: new Date(extra.next_charge_scheduled_at).toDateString(),
                delivery_at: extra.delivery_at,
                updated_at: tempDate.toISOString().replace(/T/, ' ').replace(/\..+/, ''),
                cancelled_at: null, // data unavailable??? see rc_subscription_ids
              });
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
            orphans.push({
              subscription_id: el.subscription_id,
              title: el.title,
              next_charge_scheduled_at: new Date(el.next_charge_scheduled_at).toDateString(),
              delivery_at: el.delivery_at,
              updated_at: tempDate.toISOString().replace(/T/, ' ').replace(/\..+/, ''),
              cancelled_at: null, // data unavailable??? see rc_subscription_ids
            });
          })
        };
      };
    };

    // now collect the other orphans, i.e. not tied to a subscription box
    // provided they have a charge, the others I can certainly delete
    const collected_subscription_ids = collected_rc_subscription_ids
      .map(el => el.subscription_id);
    for (const subscription of subscriptions
      .filter(el => `${el.next_charge_scheduled_at}` !== "null")
      .filter(el => {
        return collected_subscription_ids.includes(el.id) ? false : true;
      })) {
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
          delivery_at: deliveryDate,
          updated_at: tempDate.toISOString().replace(/T/, ' ').replace(/\..+/, ''),
          box_subscription_id: boxId,
          cancelled_at,
        });
      };
    };
  } catch(err) {
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
    return {};
  };

  return ({
    orphans,
    date_mismatch,
    price_mismatch,
    price_table: [ ...box_price_table ],
  });
};
