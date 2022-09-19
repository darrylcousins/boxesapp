/* Creates element to render modal form to delete a box subscription
 *
 * @module app/components/recharge/delete-modal
 * @requires module:app/form/form-modal-wrapper~FormModalWrapper
 * @requires module:app/lib/icon-button~IconButton
 * @exports CancelSubscriptionModal
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
  return (
    <Button type="warning-reverse" title="Delete Subscription" name={name}>
      <span class="b">
        Delete Subscription
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
  id: "delete-box-subscription", // form id
  title: "Delete Box Subscription",
  color: "purple",
  src: "/api/recharge-delete-subscription",
  ShowLink,
  saveMsg: "Permanently deleting box subscription ... please be patient, it will take some seconds.",
  successMsg: "Successfully deleted box subscription, reloading page.",
};

/**
 * Create a modal to permanently delete a box subscription and all its included items
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
async function* DeleteSubscription(props) {
  const { doSave, closeModal, title, subscription, formId } = props;

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
    included: {
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
    const getInitialData = () => {
      return {
        box: JSON.stringify(subscription.box),
        included: JSON.stringify(subscription.included),
      };
    };

    /*
     * Data passed to form to create the toast message to user on doSave of form
     * These values can be arbitary provided that match the template string
     */
    const toastTemplate = {
      template: "${title} - ${variant} subscription permanently deleted.",
      title: subscription.box.product_title,
      variant: subscription.box.variant_title,
    };


    yield (
      <Fragment>
        <p class="lh-copy tl">
          Permanently delete box subscription? { "" }
            <span class="b">{ subscription.box.product_title } - { subscription.box.variant_title }</span>
          <br />
          <strong>This cannot be undone.</strong>
        </p>
        <div class="dt">
          <div class="dtc gray b tr pr3 pv1">
            Subscription ID:
          </div>
          <div class="dtc pv1">
            <span>{ subscription.subscription_id }</span>
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
            Yes, Delete Subscription
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
export default FormModalWrapper(DeleteSubscription, options);
