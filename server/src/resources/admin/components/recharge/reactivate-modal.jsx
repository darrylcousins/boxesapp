/* Creates element to render modal form to reactivate a box subscription
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
import { animateFadeForAction, findNextWeekday } from "../helpers";

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
    <Button type="alt-warning-reverse" title="Reactivate Box Subscription" name={name}>
      <span class="b">
        Reactivate Box Subscription
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
  id: "reactivate-box-subscription", // form id
  title: "Reactivate Box Subscription",
  color: "dark-red",
  src: "/api/recharge-reactivate-subscription",
  ShowLink,
  saveMsg: "Reactivating box subscription ... please be patient, it will take some seconds.",
  successMsg: "Reactivation has been queued, reloading ...",
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
async function* ReactivateSubscription(props) {
  const { doSave, closeModal, title, subscription, formId } = props;

  /**
   * The next delivery date that will be created
   */
  let nextDelivery = null;
  /**
   * The next charge date that will be created
   */
  let nextCharge = null;
  /**
   * The form fields - required by {@link module:app/form/form~Form|Form}.
   *
   * @member {object} fields The form fields keyed by field title string
   */
  const fields = {
    box: {
      type: "hidden",
      datatype: "string",
    },
    includes: {
      type: "hidden",
      datatype: "string",
    },
    nextChargeDate: {
      type: "hidden",
      datatype: "string",
    },
    nextDeliveryDate: {
      type: "hidden",
      datatype: "string",
    },
  };

  const init = () => {
    // need to figure out some dates
    const delivered = new Date(Date.parse(subscription.box.properties.find(el => el.name === "Delivery Date").value));
    // get the next available day for the order (later than today)
    const now = new Date();
    now.setDate(now.getDate() + 1);
    const current = findNextWeekday(subscription.box.order_day_of_week + 1, now);

    nextCharge = new Date(current.getTime());

    nextDelivery = findNextWeekday(delivered.getDay(), current);
  };

  init();

  for await (const _ of this) { // eslint-disable-line no-unused-vars

    /**
     * The initial data of the form
     *
     * @function getInitialData
     * @returns {object} The initial data for the form
     * returns the box else compiles reasonable defaults.
     */
    const getInitialData = () => {
      return {
        box: JSON.stringify(subscription.box),
        includes: JSON.stringify(subscription.included),
        nextchargedate: nextCharge.toDateString(),
        nextdeliverydate: nextDelivery.toDateString(),
      };
    };

    /*
     * Data passed to form to create the toast message to user on doSave of form
     * These values can be arbitary provided that match the template string
     */
    const toastTemplate = {
      template: "${title} - ${variant} subscription has been queued for reactivation.",
      title: subscription.box.product_title,
      variant: subscription.box.variant_title,
    };


    yield (
      <Fragment>
        <p class="lh-copy tl">
          Reactivate cancelled box subscription? { "" }
            <span class="b">{ subscription.box.product_title } - { subscription.box.variant_title }</span>
          <br />
        </p>
        <div class="dt">
          <div class="dtc gray b tr pr3 pv1">
            Subscription ID:
          </div>
          <div class="dtc pv1">
            <span>{ subscription.subscription_id }</span>
          </div>
        </div>
        <div class="cf">
          <div class="fl w-50 gray tr pr3 pv1 b">
            Next delivery date:
          </div>
          <div class="fl w-50 pv1 b">
            { nextDelivery.toDateString() }
          </div>
          <div class="fl w-50 gray tr pr3 pv1 b">
            Next charge date:
          </div>
          <div class="fl w-50 pv1 b">
            { nextCharge.toDateString() }
          </div>
        </div>
        <Form
          data={getInitialData()}
          fields={fields}
          title={title}
          id={formId}
          meta={toastTemplate}
        />
        <div class="tr">
          <Button type="primary" onclick={doSave}>
            Yes, Reactivate Subscription
          </Button>
          <Button type="secondary" onclick={closeModal}>
            Cancel
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
export default FormModalWrapper(ReactivateSubscription, options);



