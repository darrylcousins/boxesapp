/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

export const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const rechargeWeekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/*
 * Get the next given weekday
 * @function findNextWeekday
 * @param {integer} day The day of week, Sunday: 0
 * @param {Date} current Date Object, if not given use today
 *
 */
export const findNextWeekday = (day, current) => {
  // return the date of next Thursday as 14/01/2021 for example
  // Thursday day is 4, Saturday is 6
  // If not a current date object passed then use today
  const now = current ? new Date(current.getTime()) : new Date();
  now.setDate(now.getDate() + (day + 7 - now.getDay()) % 7);
  return now;
};

/*
 * Get a date string from timestamp, ensuring nz locale
 * @function getNZDeliveryDay
 * @param {integer} timestamp A timestamp
 *
 */
export const getNZDeliveryDay = (timestamp) => {
  const d = new Date(parseInt(timestamp)).toLocaleString("en-NZ", {timeZone: "Pacific/Auckland"});
  const parts = d.split(',')[0].split('/');
  const dateString = `${parts[1]}/${parts[0]}/${parts[2]}`; // converts say 7/01/2021 to 01/7/2021
  const deliveryDay = new Date(dateString)
    .toDateString(); // results in say Thu Jan 07 2021 as in above example
  return deliveryDay;
};

