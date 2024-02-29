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
import {
  userNavigator,
  dateStringNow,
} from "../helpers";

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
  saveMsg: "Permanently deleting box subscription ... please be patient, it will take some minutes.",
  successMsg: "Successfully deleted box subscription, reloading page.",
  useSession: true, // set up socket.io to get feedback
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
  const { doSave, closeModal, title, subscription, customer, formId } = props;

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
    attributes: {
      type: "hidden",
      datatype: "string",
    },
    now: {
      type: "hidden",
      datatype: "string",
    },
    navigator: {
      type: "hidden",
      datatype: "string",
    },
    admin: {
      type: "hidden",
      datatype: "boolean",
    },
  };

  /**
   * Local save to perform actions before calling form-modal doSave
   *
   * @function thisSave
   * @returns {null}
   */
  const thisSave = () => {
    this.dispatchEvent(
      new CustomEvent("customer.disableevents", {
        bubbles: true,
        detail: { subscription_id: subscription.box.id },
      })
    );
    const title = `${subscription.box.product_title} - ${subscription.box.variant_title}`;
    const messages = [`Deleting your subscription ${title}`];
    this.dispatchEvent(
      new CustomEvent("subscription.messages", {
        bubbles: true,
        detail: { messages },
      })
    );
    doSave();
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
        includes: JSON.stringify([ subscription.box, ...subscription.included ]),
        attributes: JSON.stringify({
          customer,
          subscription_id: subscription.box.id,
          title: subscription.box.product_title,
          variant: subscription.box.variant_title,
          lastOrder: subscription.lastOrder,
          address_id: subscription.box.address_id,
        }),
        now: dateStringNow(),
        navigator: userNavigator(),
        admin: props.admin,
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
          Permanently delete box subscription { "" }
            <span class="b">{ subscription.box.product_title } - { subscription.box.variant_title }?</span>
          <br />
          <strong>This cannot be undone.</strong>
        </p>
        <div class="dt">
          <div class="dtc gray b tr pr3 pv1">
            Subscription ID:
          </div>
          <div class="dtc pv1">
            <span>{ subscription.box.id }</span>
          </div>
        </div>
        <Form
          data={getInitialData()}
          fields={fields}
          title={title}
          id={formId}
          meta={toastTemplate}
        />
        <div class="w-100 center mt3">
          <Button type="primary" onclick={thisSave}>
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
