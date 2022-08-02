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
    count = parseInt(str.slice(match.index+1, match.index+match[0].length-1));
    str = str.slice(0, match.index).trim();
  }
  return { title: str, quantity: count };
};

/* 
 * rename me to titleCase 
 */
export const capWords = (arr) => {
  return arr.map(el => el.charAt(0).toUpperCase() + el.substring(1).toLowerCase());
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

