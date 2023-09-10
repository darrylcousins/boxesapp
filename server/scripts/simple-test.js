export const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const findNextWeekday = (day, now) => {
  // return the date of next Thursday as 14/01/2021 for example
  // Thursday day is 4, Saturday is 6
  let current = now;
  if (typeof now === "undefined") {
    current = new Date();
  };
  current.setDate(current.getDate() + ((day + (7 - current.getDay())) % 7));
  return current;
};


/**
 * Takes the current delivery day string, the current variant weekday, and the
 * selected variant weekday and calculates a new delivery day, the new order
 * date, and the order_day_week value
 *
 * @function calculateDates
 * @returns { deliveryDate (obj), chargeDate (obj), orderDayOfWeek (int) }
 */
const calculateDates = (currentDate, currentVariant, newVariant) => {
  const nextDeliveryDate = new Date(Date.parse(currentDate));
  // get closest day to now
  const searchDate = findNextWeekday(weekdays.map(el => el.toLowerCase()).indexOf(currentVariant.toLowerCase()));
  // get difference between this and the delivery date so we move to a similar distance in the future
  const deltaTime = nextDeliveryDate.getTime() - searchDate.getTime();
  let deltaDays = Math.ceil(deltaTime / (1000 * 3600 * 24));
  // add 7 to keep it always ahead of the current delivery date
  deltaDays += 7;
  // if negative make positive
  deltaDays = Math.abs(deltaDays);

  const deliveryDate = findNextWeekday(weekdays.map(el => el.toLowerCase()).indexOf(newVariant.toLowerCase()));
  deliveryDate.setDate(deliveryDate.getDate() + deltaDays);

  /* Match "order_day_of_week" to 3 days before "Delivery Date"
   * "normal" weekdays in javascript are numbered Sunday = 0 but recharges uses Monday = 0
   * So to get our 3 days we'll subtract 4 days
   */
  let currentIdx = deliveryDate.getDay() - 4;
  if (currentIdx < 0) currentIdx = currentIdx + 7; // fix to ensure the future
  const orderDayOfWeek = currentIdx % 7;

  // with the delivery date we fix the next_charge_scheduled_at to 3 days prior
  const offset = deliveryDate.getTimezoneOffset()
  const chargeDate = new Date(deliveryDate.getTime() - (offset*60*1000));
  chargeDate.setDate(chargeDate.getDate() - 3);

  // Put to the required yyyy-mm-dd format
  // Not returned, just testing
  // Could use .split("T")[0] instead of substring
  const nextChargeScheduledAt = chargeDate.toISOString().split('T')[0];

  return { deliveryDate, chargeDate, orderDayOfWeek };

};

const main= async () => {
  const d = "Thu Sep 14 2023";
  let variant = "Thursday";
  let weekday = "Tuesday";

  const { deliveryDate, chargeDate, orderDayOfWeek } = calculateDates(d, variant, weekday);
  console.log("Current Delivery", d);
  console.log("New Variant", weekday);
  console.log("New Charge", chargeDate.toDateString());
  console.log("New Delivery", deliveryDate.toDateString());
  console.log("order_day_of_week", orderDayOfWeek);
};

const main_old = async () => {
  const d = "Tue Aug 29 2023";
  let variant = "Tuesday";

  const nextDeliveryDate = new Date(Date.parse(d));
  // get closest day
  let searchDate = findNextWeekday(weekdays.indexOf(variant));
  // get difference between this and the delivery date
  let deltaTime = nextDeliveryDate.getTime() - searchDate.getTime();
  let deltaDays = Math.ceil(deltaTime / (1000 * 3600 * 24));
  // add 7 to keep it always ahead of the current delivery date
  deltaDays += 7;
  // if negative make positive
  deltaDays = Math.abs(deltaDays);

  let weekday = "Saturday";
  let newDate = findNextWeekday(weekdays.indexOf(weekday));

  console.log(newDate.toDateString());
  newDate.setDate(newDate.getDate() + deltaDays)
  console.log(newDate.toDateString());

  /* Match "order_day_of_week" to 3 days before "Delivery Date"
   * "normal" weekdays in javascript are numbered Sunday = 0 but recharges uses Monday = 0
   * This is because recharge uses python in the backend
   * So to get our 3 days we'll subtract 4 days
   */
  let currentIdx = newDate.getDay() - 4; // 0 = Sunday, javascript style
  if (currentIdx < 0) currentIdx = currentIdx + 7; // fix to ensure the future
  let orderDayOfWeek = currentIdx % 7;

  // with the delivery date we fix the next_charge_scheduled_at to 3 days prior
  const offset = newDate.getTimezoneOffset()
  const nextChargeDate = new Date(newDate.getTime() - (offset*60*1000));
  nextChargeDate.setDate(nextChargeDate.getDate() - 3);
  // Put to the required yyyy-mm-dd format
  // Could use .split("T")[0] instead of substring
  const nextChargeScheduledAt = nextChargeDate.toISOString().split('T')[0];
  console.log(nextChargeDate.toDateString());
  console.log(orderDayOfWeek);
};

main().catch(console.error);
