/**
 * Simple timer to countdown seconds in a div
 *
 * @module app/lib/timer
 * @exports Timer
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment } from "@b9g/crank";

/**
 * Make a simple countdown timer
 *
 * @generator
 * @yields {Element}
 * @param {object} props  Component properties
 * @param {string} props.seconds Number of seconds to count
 * @param {string} props.callback Method to call on completion
 */
function* Timer({seconds, callback}) {

  let interval = null;
  let count = seconds;

  /*
   * End timer
   */
  const endInterval = () => {
    console.log("endInterval");
    if (interval) clearInterval(interval);
  };

  /*
   * Start timer
   */
  const startInterval = (seconds) => {
    console.log("startInterval");
    count = seconds;
    interval = setInterval(() => {
      count--;
      if (count < 1) {
        clearInterval(interval);
        //callback(startInterval, endInterval);
        callback(startInterval, endInterval);
      };
      this.refresh();
    }, 1000);
  };

  startInterval(count);

  for ({seconds, callback} of this) { // eslint-disable-line no-unused-vars
    yield (
      <Fragment>
        <div id="timer" class="dib ml3 tr">
          { count } second{ count !== 1 && "s" }
        </div>
      </Fragment>
    );
  };
};

export default Timer;

