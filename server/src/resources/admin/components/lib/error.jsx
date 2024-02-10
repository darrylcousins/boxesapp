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

  const Template = ({ children }) => (
    <div class="alert-box dark-red mv2 pt2 pl2 br3 ba b--dark-red bg-washed-red">
      <p class="tc">{ children }</p>
    </div>
  );

  //console.log('UGH', msg, typeof msg, isElement(msg), typeof msg.message, msg.error, msg.message);

  if (typeof msg === "string" || isElement(msg)) {
    return <Template>{ msg }</Template>
  }

  if (typeof msg === "object" && typeof msg.error !== 'undefined') {
    return <Template>{ msg.error }</Template>
  }

  if (typeof msg === "object" && typeof msg.message !== 'undefined') {
    return <Template>{ msg.message }</Template>
  }

  if (typeof msg === "object" || !msg.msg) {
    return <Template>{ msg.toString() }</Template>
  }

  return <Template>{ msg.msg }:{ msg.err }</Template>
};

export default ErrorMsg;
