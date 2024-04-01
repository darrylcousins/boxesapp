/**
 * Provide some helper methods
 *
 * @module app/helpers
 */

/*
 * 
 */
export const LABELKEYS = [
  'Delivery Date', 
  'Including', 
  'Add on Items', 
  'Removed Items', 
  'Swapped Items', 
];

export const userActions = [
  "reconciled",
  "updated",
  "changed",
  "paused",
  "rescheduled",
  "cancelled",
  "reactivated",
  "created",
  "deleted",
];

export const completedActions = {
  "reconciled": "navy",
  "updated": "navy",
  "changed": "dark-blue",
  "paused": "dark-blue",
  "rescheduled": "dark-blue",
  "cancelled": "purple",
  "reactivated": "navy",
  "created": "dark-green",
  "deleted": null,
};
/**
 * Helper method to animate display of messages
 *
 * @function makeTitle
 */
export const displayMessages = (display, messages) => {

  if (display) {
    const ul = display.appendChild(document.createElement("ul"));
    const intervalId = setInterval(() => {
      if (messages.length === 0) clearInterval(intervalId);
      const item = messages.shift();
      if (item) { // sanity check
        const li = ul.appendChild(document.createElement("li"));
        li.textContent = item;
      };
    }, 800);
  };
};

/**
 * Helper method to pluralize a word
 * Doesn't account for 'es' as pluralize
 *
 * @function pluralize
 */
export const pluralize = (count, word) => {
  if (count === 1) return word;
  return word + "s";
};

/*
 * Helper method to get time taken as a mins:secs string
 */
export const findTimeTaken = (d) => {
  const now = new Date();
  const millis = now.getTime() - d.getTime();
  const minutes = Math.floor(millis / 60000);
  const seconds = ((millis % 60000) / 1000).toFixed(0);
  return seconds == 60 ?
      (minutes+1) + ":00" :
      minutes + ":" + (seconds < 10 ? "0" : "") + seconds;
};

/*
 * Helper method for tidy date strings from timestamp
 */
export const dateTimeString = (timestampStr) => {
  const date = new Date(timestampStr);
  return `${date.toDateString()} ${date.toLocaleTimeString()}`;
};

/*
 * Helper method to return a date string for this moment
 */
export const dateStringNow = () => {
  const date = new Date();
  return `${date.toDateString()} ${date.toLocaleTimeString()}`;
};

/*
 * Format a date yyy-mm-dd
 * Was formally using:
    const offset = yourDate.getTimezoneOffset()
    yourDate = new Date(yourDate.getTime() - (offset*60*1000))
    return yourDate.toISOString().split('T')[0]
 * but would still get a date a day out from where I was
 */
export const formatDate = (dateObj) => {
  let month = "" + (dateObj.getMonth() + 1);
  let day = "" + dateObj.getDate();
  const year = dateObj.getFullYear();

  if (month.length < 2)  month = "0" + month;
  if (day.length < 2) day = "0" + day;
  return [year, month, day].join("-");
};

/*
 * @ function stringTemplate
 * @example:
 * let template = "I'm ${name}. I'm almost ${age} years old."
 * parseStringTemplate({name: 'Darryl', age: 60}) => I'm Darryl. I'm almost 60 years old
 *
 * <form
 *   data-template="I'm ${name}. I'm almost ${age} years old."
 *   data-name="Darryl"
 *   data-age="60"> ... </form>
 */
export const parseStringTemplate = (template, args) => {
  const result = Object.entries(args).reduce(
    (result, [arg, val]) => result.replace(`$\{${arg}}`, `${val}`),
    template,
  );
  return result;
};

/*
 * Create a loader element
 */
export const getLoader = () => {
  return `<div class="lds-ellipsis" style="height: 10px"><div></div><div></div><div></div><div></div></div></div>`;
};

/**
 * for product image forcing reload by tagging a random version number
 * so that the 'default' is not returned
 */
export const getImageUrl = (product_id) => {
  const randomId = new Date().getTime();
  return `${localStorage.getItem("host")}/product-images/${product_id}.jpg?version=${randomId}`;
};

/* 
 * Group a list products by tag
 */
export const groupProducts = (products, spaced=true) => {
  const grouped = {};
  let tag;
  for (const product of products) {
    tag = product.shopify_tag;
    if (!Object.hasOwnProperty.call(grouped, tag)) {
      grouped[tag] = [];
    };
    grouped[tag].push(product);
  };

  const sorted = sortObjectByKeys(grouped, {reverse: true});
  let final = [];
  for (const [name, list] of Object.entries(sorted)) {
    final = [...final, ...list];
    if (spaced) {
      final.push(null);
    };
  };
  return final;
};

export const hasOwnProp = Object.prototype.hasOwnProperty;

/*
 * Capitalize an array of words and return
 */
export const capWords = (arr) => {
  if (arr[0] === "CSA") return arr; // old style subscriptions
  return arr.map(el => el.charAt(0).toUpperCase() + el.substring(1).toLowerCase());
};

/*
 * Title case a sentence of words
 */
export const titleCase = (str) => capWords(str.split(" ").map(el => el.trim()).filter(el => el !== "")).join(" ");

/*
 * @function camelCaseToWords
 * @params {string} str e.g addOnProducts
 * @result {string} e.g "add on product"
 */
export const camelCaseToWords = (str) => str.replace(/[A-Z]/g, letter => ` ${letter.toLowerCase()}`);

export const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const matchNumberedString = (str) => {
  // e.g. 'Baby Kale (2)' => 'Baby Kale', 2
  str = str.trim();
  let count = 1;
  const match = str.match(/\(\d+\)$/);
  if (match) {
    count = parseInt(str.slice(match.index+1, match.index+match[0].length-1));
    str = str.slice(0, match.index).trim();
  }
  return { title: str, count };
};

/**
 * Make up a string price
 *
 * @param {number} num The integer number to use
 * @returns {string} Price string
 */
const fToString = (num) => `${(num * 0.01).toFixed(2)}`;
export const floatToString = fToString; // is this how it should be done?

/**
 * Make up a string price
 *
 * @param {number} num The integer number to use
 * @returns {string} Price string
 *
 * Rather return empty string than "NaN"
 */
export const toPrice = (num) => {
  return ( typeof num === "undefined" || Boolean(`${num}` === "NaN") ) ? "" : `$${fToString(num)}`;
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
export const sortObjectByKeys = (o, options) => {
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
export const sortObjectByKey = (o, key, reverse) => {
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
  if (reverse) {
    return o.reverse();
  };
  return o;
};

/**
 * Method to pass to sort an array of date strings
 *
 * @function dateStringSort
 */
export const dateStringSort = (a, b) => {
  if (Date.parse(a) && Date.parse(b)) {
    let dateA = new Date(Date.parse(a));
    let dateB = new Date(Date.parse(b));
    if (dateA < dateB) return -1;
    if (dateA > dateB) return 1;
    return 0;
  } else {
    return 0;
  }
};

/**
 * Is the given string a valid date string
 *
 * @function isValidDateString
 * @param {str} a string
 * @returns {boolean} True or false
 */
export const isValidDateString = (str) => {
  const d = new Date(Date.parse(str));
  return d instanceof Date && !isNaN(d);
};

/**
 * Get the next upcoming date for a particular weekday
 *
 * @function findNextWeekday
 * @param {number} day Integer day of week, Monday -> 0
 * @returns {object} Date object
 */
export const findNextWeekday = (day, now) => {
  // return the date of next Thursday as 14/01/2021 for example
  // Thursday day is 4, Saturday is 6
  let current = new Date(now);
  if (typeof now === "undefined") {
    current = new Date();
  };
  current.setDate(current.getDate() + ((day + (7 - current.getDay())) % 7));
  return current;
};

/**
 * Get date string to pass to input[type=date], i.e. "2020-12-31"
 *
 * @function dateStringForInput
 * @param {string} A date string to pass to new Date.
 * @returns {object} Date string
 */
export const dateStringForInput = (str) => {
  let d;
  let dateString;
  if (str) {
    d = new Date(str);
  } else {
    d = new Date();
  }
  const zeroPad = (num, places) => String(num).padStart(places, "0");
  const year = d.getFullYear();
  const day = zeroPad(d.getDate(), 2);
  const month = zeroPad(d.getMonth() + 1, 2);

  return `${year}-${month}-${day}`;
};

/** Provide standard animationOptions
 *
 * @member {object} animationOptions
 */
export const animationOptions = {
  duration: 400,
  easing: "ease",
  fill: "both",
};

/**
 * Animate a fade and execute an action on end
 * Can I collapse it after animate?
 *
 * @function animateFadeForAction
 */
export const animateFadeForAction = (id, action, duration, collapse) => {
  if (typeof collapse === "undefined") collapse = false;
  let target;
  if (typeof id === "string") {
    target = document.getElementById(id);
  } else {
    target = id;
  };
  const options = { ...animationOptions };
  if (duration) options.duration = duration;
  const animate = target.animate(
    { opacity: 0.1 },
    options
  );
  animate.addEventListener("finish", async () => {
    if (collapse) {
      // need to set style height for collapse to work correctly
      //target.classList.add("hide"); // and hide, though this may bite me if I forget
      target.style.height = transitionElementHeight(target); // doesn't seem to nicely collapse?
      collapseElement(target); // doesn't seem to nicely collapse?
      await delay(600); // 
    } else {
      target.animate(
        { opacity: 1 },
        options
      );
    };
    if (action) {
      await action();
    };
  });
};

/**
 * Animate a fade
 *
 * @function animateFade
 */
export const animateFade = (id, opacity) => {
  let target;
  if (typeof id === "string") {
    target = document.getElementById(id);
  } else {
    target = id;
  }
  const animate = target.animate(
    {
      opacity,
    },
    animationOptions
  );
};

/*
 * @function collapseElement
 * from https://css-tricks.com/using-css-transitions-auto-dimensions/
 *
 */
export const collapseElement = (element) => {
  if (!element) return;
  const elementHeight = element.scrollHeight;
  var elementTransition = element.style.transition;
  /* add class collapsible 
  elementTransition = "height .6s";
  element.style.transition = "";
  */
  requestAnimationFrame(() => {
    element.style.height = elementHeight + "px";
    //element.style.transition = elementTransition;
    requestAnimationFrame(() => {
      element.style.height = 0 + "px";
    });
  });
}

/*
 * @function transitionElementHeight
 * from https://css-tricks.com/using-css-transitions-auto-dimensions/
 * .collapsible {
 *   overflow:hidden;
 *   transition: height 0.8s ease-out;
 *   height:auto;
 * }
 *
 */
export const transitionElementHeight = (element, start) => {
  if (!element) return;
  let calculatedHeight = start ? start : 25; // needs extra space because appears to shrink a little on each refresh
  // simply using el.scrollHeight can give some odd results when element is shrinking
  element.childNodes.forEach(el => {
    calculatedHeight += el.scrollHeight;
    // this worked well in docs, try it here and may not need the start value of 25?
    //if (el.classList.contains("bb") || el.classList.contains("bt")) calculatedHeight += 1;
  });
  element.style.height = calculatedHeight + "px";
  return element.style.height;
};

/*
 * @function formatCount
 * Format attempts count
 *
 */
export const formatCount = (count) => {
  if (count === 1) return `${count}st`;
  if (count === 2) return `${count}nd`;
  if (count === 3) return `${count}rd`;
  return `${count}th`;
};

/*
 * @function delay
 * Wait for a time
 *
 */
export const delay = (t) => {
  return new Promise(resolve => setTimeout(resolve, t));
};

/*
 * @function sleepUntil
 * Wait for element to be rendered is how I used this for the most part
 * From https://levelup.gitconnected.com/javascript-wait-until-something-happens-or-timeout-82636839ea93
 *
 */
export const sleepUntil = async (f, timeoutMs) => {
  if (typeof timeoutMs === "undefined") timeoutMs = 10000;
  return new Promise((resolve, reject) => {
    let timeWas = new Date();
    let wait = setInterval(function() {
      if (f()) {
        try {
          clearInterval(wait);
        } catch(e) {
        };
        const res = f();
        resolve(res);
      } else if (new Date() - timeWas > timeoutMs) { // Timeout
        try {
          clearInterval(wait);
        } catch(e) {
        };
        reject(null);
      }
      }, 20);
    });
}


/*
 * @function userNavigator
 *
 */
export const userNavigator = () => {
  const browserList = [
    { name: "Firefox", value: "Firefox" },
    { name: "Opera", value: "OPR" },
    { name: "Edge", value: "Edg" },
    { name: "Chrome", value: "Chrome" },
    { name: "Safari", value: "Safari" },
  ];
  const osList = [
    { name: "Android", value: "Android" },
    { name: "iPhone", value: "iPhone" },
    { name: "iPad", value: "Mac" },
    { name: "Macintosh", value: "Mac" },
    { name: "Linux", value: "Linux" },
    { name: "Windows", value: "Win" },
  ];

  const browserChecker = () => {
    let data = {};
    //Useragent contains browser details and OS  details but we need to separate them
    const userDetails = window.navigator.userAgent;
    for (let i in browserList) {
      //check if the string contains any value from the array
      if (userDetails.includes(browserList[i].value)) {
        //extract browser name and version from the string
        data.browser = browserList[i].name || "Unknown Browser";
        break;
      };
    };
    for (let i in osList) {
      //check if string contains any value from the object
      if (userDetails.includes(osList[i].value)) {
        //display name of OS from the object
        data.os =  osList[i].name;
        break;
      };
    };
    return data;
  };

  const { browser, os } = browserChecker();
  return `${browser}/${os}`;
};
