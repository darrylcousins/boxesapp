/**
 * Designed to wrap Subscription and Cancelled in order to share methods and attributes
 *
 * @module app/recharge/subscription-wrapper
 * @exports SubscriptionWrapper
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment, Portal } from "@b9g/crank";

/**
 * Wrap a crank Component and provide modal 
 *
 * @function FormModalWrapper
 * @returns {Function} Return the wrapped component
 * @param {object} Component The component to be wrapped
 * @param {object} options Options for form and modal
 * @param {object} options.useSession Use session.io // the id should point to a messaging div
 */
function SubscriptionWrapper(Component, options) {
  /**
   * Wrap a crank Component and provide modal and form functionality
   *
   * @function Wrapper
   * @yields {Element} Return the wrapped component
   * @param {object} props Property object
   */
  return function* (props) {
    for (props of this) {
      yield (
        <Fragment>
          {fetchError && <Error msg={fetchError} />}
          {!loading && !success && (
            <Component
              {...props}
            />
          )}
        </Fragment>
      );
    };
  };
}

export default FormModalWrapper;
