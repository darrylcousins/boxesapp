/* eslint-disable */
/**
 * Provide some helper methods
 *
 * @module app/helpers
 */

/** Provide standard animationOptions
 *
 * @method {object} hasOwnProp
 * @returns {boolean} Returns true if the property exists on the object
 */
export const hasOwnProp = Object.prototype.hasOwnProperty;

/** Provide access to the app settings
 *
 * @method {object} getSetting
 * @returns {boolead} Returns true if the property exists on the object
 */
export const getSetting = (type, key) => {
  const appJson = document.querySelector("#box-settings-json");
  const appSettings = JSON.parse(appJson.textContent);
  if (hasOwnProp.call(appSettings, type)) {
    const settings = appSettings[type];
    if (hasOwnProp.call(settings, key)) {
      return settings[key];
    };
  };
  return "";
};

/** Provide access to the app box rules
 *
 * @method {object} getRule
 * @param {string} Box sku
 * @param {string} Selected date
 * @returns {boolead} Returns true if the property exists on the object
 */
export const getRules = (product_id, date) => {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const rulesJson = document.querySelector("#box-rules-json");
  const rules = JSON.parse(rulesJson.textContent);
  const day = days[new Date(date).getDay()];
  const boxRules = rules.filter(rule => {
    return (rule.box_product_ids.includes(product_id)) && (rule.weekday.includes(day));
  });
  return boxRules.map(el => el.value);
};

/** Find the requested get parameter from window location object
 *
 * @method {object} findGetParameter
 * @returns {string} The requested get parameter if it exists
 */
export const findGetParameter = (parameterName) => {
  let result = null;
  let tmp = [];
  window.location.search
    .substr(1)
    .split("&")
    .forEach(function (item) {
      tmp = item.split("=");
      if (tmp[0] === parameterName) result = decodeURIComponent(tmp[1]);
  });
  return result;
}

/**
 * Shallow compare two objects - adequate from 'flat' objects of key/value pairs
 *
 * @returns {boolean} Returns true if shallow comparison passes
 * @param {object} object1 Object to compare
 * @param {object} object2 Other object to compare
 * @example
 * const o1 = {me: 'dc', you: 'mh'};
 * const o2 = {me: 'dc', you: 'mh'};
 * shallowEqual(o1, o2) // true
 */
export const shallowEqual = (object1, object2) => {
  const keys1 = Object.keys(object1);
  const keys2 = Object.keys(object2);

  if (keys1.length !== keys2.length) {
    return false;
  }

  for (let key of keys1) {
    if (object1[key] !== object2[key]) {
      return false;
    }
  }

  return true;
}

/** Provide standard animationOptions
 *
 * @member {object} animationOptions
 */
export const animationOptions = {
  duration: 400,
  easing: "ease",
  fill: "both"
};

/**
 * Animate a fade and execute an action on end
 *
 * @function animateFadeForAction
 */
export const animateFadeForAction = (id, action) => {

  let target;
  if (typeof id === "string") {
    target = document.getElementById(id);
  } else {
    target = id;
  };
  const animate = target.animate({
    opacity: 0.1
  }, animationOptions);
  animate.addEventListener("finish", async () => {
    if (action) {
      await action();
    }
    target.animate({
      opacity: 1
    }, animationOptions);
  });

};

/**
 * Sort an object by it's keys.
 *
 * @function sortObjectByKeys
 * @param {object} o An object
 * @returns {object} The sorted object
 * @example
 * sortObjectByKeys({'c': 0, 'a': 2, 'b': 1});
 * // returns {'a': 2, 'b': 1, 'c': 0}
 */
export const sortObjectByKeys = (o, options={}) => {
  if (Object.hasOwnProperty.call(options, 'reverse')) {
    return Object.keys(o)
      .sort()
      .reverse()
      .reduce((r, k) => ((r[k] = o[k]), r), {});
  } else {
    return Object.keys(o)
      .sort()
      .reduce((r, k) => ((r[k] = o[k]), r), {});
  };
};

/**
 * Sort an array of objects by key.
 *
 * @function sortObjectByKey
 * @param {object} o An object
 * @param {string} key The attribute to sort
 * @returns {object} The sorted object
 * @example
 * sortObjectByKey([{'s1': 5, 's2': 'e'}, {'s1': 2, 's2': 'b'}], 's1');
 * // returns [{'s1': 2, 's2': 'b'}, {'s1': 5, 's2': 'e'}]
 * sortObjectByKey([{'s1': 5, 's2': 'e'}, {'s1': 2, 's2': 'b'}], 's2');
 * // returns [{'s1': 2, 's2': 'b'}, {'s1': 5, 's2': 'e'}]
 */
export const sortObjectByKey = (o, key) => {
  o.sort((a, b) => {
    let nameA = a[key];
    let nameB = b[key];
    if (!Number.isInteger) {
      nameA = a[key].toUpperCase(); // ignore upper and lowercase
      nameB = b[key].toUpperCase(); // ignore upper and lowercase
    }
    if (nameA < nameB) return -1;
    if (nameA > nameB) return 1;
    return 0;
  });
  return o;
};

/**
 * Get the next upcoming date for a particular weekday
 *
 * @function findNextWeekday
 * @param {number} day Integer day of week, Monday -> 0
 * @returns {object} Date object
 */
export const findNextWeekday = (day) => {
  // return the date of next Thursday as 14/01/2021 for example
  // Thursday day is 4, Saturday is 6
  const now = new Date();
  now.setDate(now.getDate() + ((day + (7 - now.getDay())) % 7));
  return now;
};

/**
 * Make up a string price
 *
 * @param {number} num The integer number to use
 * @returns {string} Price string
 */
export const toPrice = (num) => `$${(num * 0.01).toFixed(2)}`;

/**
 * Figure the price for the element, if it's a standard included product only
 * extra quantities greater than one incur a price
 *
 * @param {object} el The target element
 * @param {boolean} includes Is this a standard included product?
 * @returns {string} Price string
 */

export const getPrice = (el, includes) => {
  const price = toPrice(el.shopify_price * (includes ? el.quantity - 1 : el.quantity));
  return price;
};

/**
 * Split the string
 * e.g. 'Baby Kale (2)' => 'Baby Kale', 2
 *
 * @param {string} str The string to split
 * @returns {object} Title and count
 */
export const matchNumberedString = (str) => {
  str = str.trim();
  let count = 1;
  const match = str.match(/\(\d+\)$/);
  if (match) {
    count = parseInt(str.slice(match.index+1, match.index+match[0].length-1));
    str = str.slice(0, match.index).trim();
  }
  return { str, count };
};

