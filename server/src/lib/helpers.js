/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

/*
 * More general helpers methods
 */
export const matchNumberedString = (str) => {
  // e.g. 'Baby Kale (2)' => 'Baby Kale', 2
  str = str.trim();
  let count = 1;
  const match = str.match(/\(\d+\)$/);
  if (match) {
    count = parseInt(str.slice(match.index+1, match.index+match[0].length-1), 10);
    str = str.slice(0, match.index).trim();
  }
  return { title: str, quantity: count };
};

export const delay = (t) => {
  return new Promise(resolve => setTimeout(resolve, t));
};

/* 
 * rename me to titleCase 
 */
export const capWords = (arr) => {
  return arr.map(el => el.charAt(0).toUpperCase() + el.substring(1).toLowerCase());
};

/*
 * Format a date yyy-mm-dd
 * Was formally using:
    const offset = yourDate.getTimezoneOffset()
    yourDate = new Date(yourDate.getTime() - (offset*60*1000))
    return yourDate.toISOString().split('T')[0]
 * but would still get a date a day out from where I was
 * Usually we're only parsing a day date object and not a datetime obj, this may be the kurfuffle
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
 * compare 2 arrays
 */
export const compareArrays = (a, b) => {
  return (a.length === b.length && a.every((element, index) => element === b[index]));
};

/*
 * Sort an object by keys
 * i.e. {'b': b, 'a': a} => {"a": a, "b": b}
 */
export const sortObjectByKeys = (o) => Object.keys(o).sort().reduce((r, k) => (r[k] = o[k], r), {});

/*
 * Sort an array of objects by a particular key
 * i.e. [ {"key": "b"}, {"key": "a" } ] => [ {"key": "a"}, {"key": "b" } ]
 */
export const sortObjectArrayByKey = (myArray, key) => {
  myArray.sort((a, b) => {
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
  return myArray;
};

