/**
 * Creates element to render modal form to skip a subscription
 *
 * @module app/components/recharge/skip-modal
 * @requires module:app/form/form-modal-wrapper~FormModalWrapper
 * @requires module:app/lib/icon-button~IconButton
 * @exports SkipChargeModal
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment } from "@b9g/crank";
import Button from "../lib/button";
import FormModalWrapper from "../form/form-modal";
import Form from "../form";

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
  console.log(opts);
  return (
    <Button type="primary-reverse" title="Pause Subscription" name={name}>
      <span class="b">
        Pause Subscription
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
  id: "pause-subscription", // form id - matches name in ShowLink which is title.toHandle
  title: "Pause Subscription",
  color: "dark-red",
  src: "/api/recharge-skip-charge",
  ShowLink,
  saveMsg: "Pausing subscription ...",
  successMsg: "Successfully paused subscription, reloading page.",
};

/**
 * Create a modal to skip a charge.
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
async function* SkipCharge(props) {
  const { doSave, closeModal, title, subscription, formId } = props;

  /**
   * The form fields - required by {@link module:app/form/form~Form|Form}.
   *
   * @member {object} fields The form fields keyed by field title string
   */
  const fields = {
    attributes: {
      type: "hidden",
      datatype: "string",
    },
    includes: {
      type: "hidden",
      datatype: "string",
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
      attributes: JSON.stringify(subscription.attributes),
      includes: JSON.stringify(subscription.includes),
    });

    /*
     * Data passed to form to create the toast message to user on doSave of form
     * These values can be arbitary provided that match the template string
     */
    const toastTemplate = {
      template: "${title} - ${variant} subscription skipped successfully.",
      title: subscription.box.shopify_title,
      variant: subscription.attributes.variant,
    };

    const deliveredObj = new Date(Date.parse(subscription.attributes.nextDeliveryDate));
    deliveredObj.setDate(deliveredObj.getDate() + subscription.attributes.days);
    const updatedDelivery = deliveredObj.toDateString();

    const chargeObj = new Date(Date.parse(subscription.attributes.nextChargeDate));
    chargeObj.setDate(chargeObj.getDate() + subscription.attributes.days);
    const updatedCharge = chargeObj.toDateString();

    yield (
      <Fragment>
        <p class="lh-copy tl">
          Are you sure you want to pause the subscription?<br />
          <b class="pt3">This cannot be undone.</b>
          <div class="cf">
            <div class="fl w-50 gray tr pr3 pv1 b">
              This charge date:
            </div>
            <div class="fl w-50 pv1 b">
              { subscription.attributes.nextChargeDate }
            </div>
            <div class="fl w-50 gray tr pr3 pv1 b">
              Scheduled delivery date:
            </div>
            <div class="fl w-50 pv1 b">
              { subscription.attributes.nextDeliveryDate }
            </div>
          </div>
        </p>
        <p class="lh-copy tl">
          <div class="cf">
            <div class="fl w-50 gray tr pr3 pv1 b">
              New charge date will be:
            </div>
            <div class="fl w-50 pv1 b">
              { updatedCharge }
            </div>
            <div class="fl w-50 gray tr pr3 pv1 b">
              New delivery date will be:
            </div>
            <div class="fl w-50 pv1 b">
              { updatedDelivery }
            </div>
          </div>
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
            Yes, Pause Subscription
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
export default FormModalWrapper(SkipCharge, options);

