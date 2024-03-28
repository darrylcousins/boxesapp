/**
 * Provide some helper methods
 *
 * @module app/helpers
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { createElement, Fragment } from "@b9g/crank";
import CollapseWrapper from "../lib/collapse-animator.jsx";
import { DoubleArrowDownIcon } from "../lib/icon.jsx";
import { DoubleArrowUpIcon } from "../lib/icon.jsx";

/**
 * Possible selections to make on object type
 *
 * @member possibleObjects
 * @type {array}
 */
const possibleObjects = ["order", "recharge", "shopify", "mail", "product", "all"];
/**
 * Property titles - can be excluded in log listing to keep thing tidier - can also be included!
 *
 * @member possibleObjects
 * @type {array}
 */
const propertyAttributes = ["Including", "Add on Items", "Removed Items", "Swapped Items"];

/*
 * Helper method for tidy date strings from timestamp
 */
const dateString = (el) => {
  return el.timestamp.replace("T", " ").replace("Z", "");
  const date = new Date(el.timestamp);
  return `${date.toDateString()} ${date.toLocaleTimeString({ hour: "2-digit", minute: "2-digit" })}`;
};

/*
 * Helper method
 */
const getLogMessage = (el) => {
  // if an api call, then include title
  if (el.message.startsWith("API call")) {
    const obj = Object.keys(el.meta)[0];
    let metaData;
    if (possibleObjects.includes(obj)) {
      if (Object.hasOwn(el.meta[obj], "title")) {
        return el.meta[obj].title;
      };
    };
  } else if (el.message.startsWith("Webhook")) {
    const str = el.message.slice(8);
    return str.charAt(0).toUpperCase() + str.substring(1).toLowerCase();
  };

  return el.message;
};

/*
 * Helper method
 */
const getMetaObject = (el) => {
  if (!Object.hasOwnProperty.call(el, 'meta')) {
    return <div>&nbsp;</div>;
  };
  // expecting just one object on meta 'order', 'product', 'customer', 'subscription'?
  if (el.meta === null) {
    return <div>&nbsp;</div>;
  };
  let str;
  const obj = Object.keys(el.meta)[0];
  if (possibleObjects.includes(obj)) {
    str = obj.charAt(0).toUpperCase() + obj.slice(1);
  } else {
    str = "Error";
  };
  return str;
};

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
  if (obj === null) return (
    <Fragment><span class="gray">{title}:</span> null</Fragment>
  );

  const final = [];
  let classes;
  // assumes an object
  for (const [key, value] of Object.entries(obj)) {
    classes = [];
    if (Number.isInteger(parseInt(key))) { // arrays
      if (typeof value === "object") { // array of objects
        final.push(formatObj(value, key));
        classes.push("bb b--gray pb2 mt2");
      } else {
        final.push(value);
      };
    } else if (typeof value === "object") {
      final.push(formatObj(value, key));
      classes.push("bb b--gray pb2 mt2");
    } else {
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        final.push(<Fragment><span class="gray">{key}:</span> <span>{value.toString()}</span></Fragment>);
      } else if (value === null) {
        final.push(<Fragment><span class="gray">{key}:</span> <span>{null}</span></Fragment>);
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
  if (propertyAttributes.includes(title)) {
    return formatList(obj);
  };
  if (title === "stack") { // special case for error
    const fixLine = (line, idx) => {
      if (idx === 0) line = line.split(":").slice(1).join(""); // remove repeated message and only show error type
      if (idx > 0) line = line.split("src").slice(1); // shorten path
      return line;
    };
    return (
      <div>
        { obj.split("\n").slice(0,4).map((line, idx) => (
          <p class="ma0">{ fixLine(line, idx) }</p>
        ))}
      </div>
    );
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
    if (title === "title") {
      return <span class="b">{obj}</span>;
    } else {
      return `${obj}`;
    };
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
const formatMeta = (el, logLevel, includeProperties, includeRcIDs, includeMessages) => {
  if (!Object.hasOwnProperty.call(el, 'meta')) {
    return <div>&nbsp;</div>;
  };
  if (el.meta === null) {
    return <div>&nbsp;</div>;
  };
  // expecting just one object on meta 'order', 'product', 'customer', 'subscription'?
  const obj = Object.keys(el.meta)[0];

  let metaData;
  if (possibleObjects.includes(obj)) {
    metaData = Object.entries(el.meta[obj]);
    if (!includeProperties) {
      metaData = metaData.filter(([title, str]) => !propertyAttributes.includes(title));
      metaData = metaData.filter(([title, str]) => title !== "properties");
    };
    if (!includeRcIDs) {
      metaData = metaData.filter(([title, str]) => title !== "rc_subscription_ids");
    };
    if (!includeMessages) {
      metaData = metaData.filter(([title, str]) => title !== "change_messages");
    };
    return (
      <div class="dt dt-fixed w-100 mv1">
        { metaData.map(([title, str]) => (
            <div class="dt-row w-100">
              <div class="dtc w-40 gray tr pr2">
                { title }:
              </div>
              <div class="dtc w-60" style="min-width: 500px; width: 500px; word-wrap: break-word;">
                { formatOther(str, title) }
              </div>
            </div>
        ))}
      </div>
    );
  } else { //logLevel === "error"
    metaData = Object.entries(el.meta);
    return (
      <div class="dt w-100 mv1">
        { Object.entries(el.meta).map(([title, str]) => (
            <div class="dt-row w-100">
              <div class="dtc w-20 gray tr pr2">
                { title }:
              </div>
              <div class="dtc w-80" style="min-width: 500px; width: 500px; word-wrap: break-word;">
                { formatOther(str, title) }
              </div>
            </div>
        ))}
      </div>
    );
  };
};

export {
  formatMeta,
  getMetaObject,
  getLogMessage,
  possibleObjects,
  dateString,
};
