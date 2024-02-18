/**
 * Provide some helper methods
 *
 * @module app/helpers
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { createElement, Fragment } from "@b9g/crank";
/*
 * Helper method for tidy date strings from timestamp
 */
const dateString = (el) => {
  const date = new Date(el.timestamp);
  return `${date.toDateString()} ${date.toLocaleTimeString()}`;
};

/**
 * Possible selections to make on object type
 *
 * @member possibleObjects
 * @type {array}
 */
const possibleObjects = ["order", "recharge", "shopify", "mail", "all"];

/*
 * Helper method to render comma separated list
 */
const formatList = (str) => {
  if (str === null) return "None";
  if (str.length === 0) return "None";
  return (
    str.split(",").map(el => <div>{ el }</div>)
  );
};

/*
 * Helper method to render objects
 */
const formatObj = (obj, title) => {
  if (obj === null) return <div>{ title }: null</div>;

  const final = [];
  let classes;
  // assumes an object
  for (const [key, value] of Object.entries(obj)) {
    classes = [];
    if (Number.isInteger(parseInt(key))) { // arrays
      if (typeof value === "object") { // array of objects
        final.push(formatObj(value, key));
        classes.push("bb b--black-20");
      } else {
        final.push(value);
      };
    } else if (typeof value === "object") {
      final.push(formatObj(value, key));
      classes.push("bb b--black-20");
    } else {
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        final.push(`${key}: ${value}`);
      } else if (value === null) {
        final.push(`${key}: null`);
      } else {
        final.push(formatObj(value, key));
      };
    };
  };
  if (title) {
    if (Number.isInteger(parseInt(title))) { // arrays
      return (
        final.map(el => <div class={ classes.join(" ") }>{ el }</div>)
      );
    } else {
      return (
        <div class="dt-row w-100">
          <div class="dtc gray tr pr2">
            { title }:
          </div>
          <div class="dtc">
            { final.map(el => <div class={ classes.join(" ") }>{ el }</div>) }
          </div>
        </div>
      );
    };
  } else {
    return (
      final.map(el => <div class={ classes.join(" ") }>{ el }</div>)
    );
  };
};

/*
 * Helper method to render everything
 */
const formatOther = (obj, title) => {

  // Special case, not sure how else to figure this one out
  const attributes = ["Including", "Add on Items", "Removed Items", "Swapped Items"];
  if (attributes.includes(title)) {
    return formatList(obj);
  };

  // attempt parse any json strings
  try {
    obj = JSON.parse(obj);
  } catch(e) {
    obj = obj;
  };

  if (JSON.stringify(obj, null, 2) === "null") {
    return "null";
  };

  if (typeof obj !== "object") {
    return `${obj}`;
  };

  // now want to format the json
  try {
    return formatObj(obj);
  } catch(e) {
    console.warn(e);
    console.warn(title);
    console.warn(obj);
    return JSON.stringify(obj);
  };
};

/*
 * Helper method to render log.meta
 */
const formatMeta = (el) => {
  if (!Object.hasOwnProperty.call(el, 'meta')) {
    return <div>&nbsp;</div>;
  };
  if (el.meta === null) {
    return <div>&nbsp;</div>;
  };
  // expecting just one object on meta 'order', 'product', 'customer', 'subscription'?
  const obj = Object.keys(el.meta)[0];
  if (possibleObjects.includes(obj) && el.meta[obj]) {
    return (
      <div class="dt w-100 mv1">
        { Object.entries(el.meta[obj]).map(([title, str]) => (
            <div class="dt-row w-100">
              <div class="dtc w-20 gray tr pr2">
                { title }:
              </div>
              <div class="dtc w-80" style="width: 400px; word-wrap: break-word;">
                { formatOther(str, title) }
              </div>
            </div>
        ))}
      </div>
    );
  } else {
    // Only used for error messages?
    return (
      <div class="dt w-100 mv1">
        { Object.entries(el.meta).map(([title, str]) => (
            <div class="dt-row w-100">
              <div class="dtc w-30 gray tr pr2">
                { title }:
              </div>
              <div class="dtc w-70">
                { str }
              </div>
            </div>
        ))}
      </div>
    );
  };
};

export {
  formatMeta,
  possibleObjects,
  dateString,
};
