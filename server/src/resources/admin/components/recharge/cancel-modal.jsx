/**
 * Creates element to render modal form to cancel a box subscription
 *
 * @module app/components/recharge/cancel-modal
 * @requires module:app/form/form-modal-wrapper~FormModalWrapper
 * @requires module:app/lib/icon-button~IconButton
 * @exports CancelSubscriptionModal
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment } from "@b9g/crank";
import Button from "../lib/button";
import FormModalWrapper from "../form/form-modal";
import Form from "../form";
import { animateFadeForAction } from "../helpers";

/**
 * Icon component for link to expand modal
 *
 * @function ShowLink
 * @param {object} opts Options that are passed to {@link module:app/lib/icon-button~IconButton|IconButton}
 * @param {string} opts.name Name as identifier for the action
 * @param {string} opts.title Hover hint and hidden span
 * @param {string} opts.color Icon colour
 * @returns {Element} IconButton
 */
const ShowLink = (opts) => {
  const { name, title, color } = opts;
  return (
    <Button type="warning" title="Cancel Box Subscription" name={name}>
      <span class="b">
        Cancel Box Subscription
      </span>
    </Button>
  );
};

/**
 * Options object passed to module:app/components/form-modal~FormModalWrapper
 *
 * @member {object} options
 */
const options = {
  id: "cancel-box-subscription", // form id
  title: "Cancel Box Subscription",
  color: "dark-red",
  src: "/api/recharge-cancel-subscription",
  ShowLink,
  saveMsg: "Cancelling box subscription ...",
  successMsg: "Successfully cancelled box subscription, reloading page.",
};

/**
 * Create a modal to cancel a box subscription and all its included items
 *
 * @generator
 * @yields {Element} A form and remove/cancel buttons.
 * @param {object} props Property object
 * @param {Function} props.doSave - The save action
 * @param {Function} props.closeModal - The cancel and close modal action
 * @param {string} props.title - Form title
 * @param {object} props.box - The box to be removed
 * @param {string} props.formId - The unique form indentifier
 */
async function* CancelSubscription(props) {
  const { doSave, closeModal, title, subscription, formId } = props;

  /**
   * The form fields - required by {@link module:app/form/form~Form|Form}.
   *
   * @member {object} fields The form fields keyed by field title string
   */
  const fields = {
    subscription_id: {
      type: "hidden",
      datatype: "string",
    },
    includes: {
      type: "hidden",
      datatype: "string",
    },
    attributes: {
      type: "hidden",
      datatype: "string",
    },
    cancellation_reason: {
      label: "Please provide a short note for the cancellation",
      placeholder: `I no longer requires ${subscription.box.shopify_title} on ${subscription.attributes.variant}s.`,
      type: "text",
      required: true,
      valid: false,
      size: 100,
    },
  };

  for await (const _ of this) { // eslint-disable-line no-unused-vars

    /**
     * The initial data of the form
     *
     * @function getInitialData
     * @returns {object} The initial data for the form
     * returns the box else compiles reasonable defaults.
     */
    const getInitialData = () => ({
      subscription_id: `${subscription.attributes.subscription_id}`,
      includes: JSON.stringify(subscription.includes),
      attributes: JSON.stringify(subscription.attributes),
      cancellation_reason: "",
    });

    /*
     * Data passed to form to create the toast message to user on doSave of form
     * These values can be arbitary provided that match the template string
     */
    const toastTemplate = {
      template: "${title} - ${variant} subscription cancelled successfully.",
      title: subscription.box.shopify_title,
      variant: subscription.attributes.variant,
    };

    yield (
      <Fragment>
        <p class="lh-copy tl">
          Are you sure you want to cancel this box subscription?<br />
          <b class="pt3">This cannot be undone.</b>
        </p>
        <Form
          data={getInitialData()}
          fields={fields}
          title={title}
          id={formId}
          meta={toastTemplate}
        />
        <div class="tr">
          <Button type="primary" onclick={doSave}>
            Yes, Remove Subscription
          </Button>
          <Button type="secondary" onclick={closeModal}>
            No
          </Button>
        </div>
      </Fragment>
    );
  }
}

/**
 * Wrapped component
 *
 * @member {object} SkipChargeModal
 */
export default FormModalWrapper(CancelSubscription, options);


