/**
 * Error display component module
 *
 * @module app/lib/error
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, isElement } from "@b9g/crank";

/**
 * Error component
 *
 * @returns {Element} DOM component
 * @param {object} props  Component properties
 * @param {Element|string|object} props.msg Error to be displayed
 * @example
 * { error && <ErrorMsg msg="Some error message" /> }
 */
const ErrorMsg = ({ msg }) => {
  // console.log(msg, typeof msg, isElement(msg));
  if (typeof msg === "string" || isElement(msg)) {
    return (
      <div class="dark-red mv2 pt2 pl2 br3 ba b--dark-red bg-washed-red">
        <p class="tc">{msg}</p>
      </div>
    );
  }

  if (typeof msg === "object" || !msg.msg) {
    return (
      <div class="dark-red mv2 pt2 pl2 br3 ba b--dark-red bg-washed-red">
        <p class="tc">{msg.toString()}</p>
      </div>
    );
  }

  return (
    <div class="dark-red mv2 pt2 pl2 br3 ba b--dark-red bg-washed-red">
      <p class="tc">
        {msg.msg}:{msg.err}
      </p>
    </div>
  );
};

export default ErrorMsg;
