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
import {
  animateFadeForAction,
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
  src: "/api/recharge-update-charge-date",
  ShowLink,
  saveMsg: "Pausing subscription ... please be patient, it will take some minutes.",
  successMsg: "Updates have been queued, reloading ...",
  useSession: true, // set up socket.io to get feedback, requires passing a div id for messages
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
 * @param {object} props.subscription - The subscription to be paused
 * @param {string} props.formId - The unique form indentifier
 */
async function* SkipCharge(props) {
  const { doSave, closeModal, title, subscription, formId } = props;

  console.log("skip charge component, admin?", props.admin);
  const deliveryDays = [];
  const chargeDays = [];
  const intervalDays = [];
  /* july 2023 allow fortnightly subscriptions to change date at weekly intervals */
  /*
  const interval = subscription.attributes.days === 7 ? 7 : 14;
  const multiplier = subscription.attributes.days === 7 ? 1 : 2;
  const count = subscription.attributes.days === 7 ? 3 : 2;
  */
  const interval = 7;
  const multiplier = 1;
  const count = 2;
  let delivered = new Date(Date.parse(subscription.attributes.nextDeliveryDate));
  let charge = new Date(Date.parse(subscription.attributes.nextChargeDate));
  for (let i=0; i<count; i++) {
    intervalDays.push(`${multiplier * (i + 1)} week${i > 0 ? "s" : ""}`);
    delivered.setDate(delivered.getDate() + interval);
    deliveryDays.push(delivered.toDateString());
    charge.setDate(charge.getDate() + interval);
    chargeDays.push(charge.toDateString());
  };

  let intervalIndex = 0;

  /*
   * Updates on box selection
   * Load dates available for the selected box
   */
  const onIntervalChange = async (ev) => {
    intervalIndex = intervalDays.indexOf(ev.target.value);
    const chargeEl = document.getElementById("charge-date");
    const deliveryEl = document.getElementById("delivery-date");
    animateFadeForAction(chargeEl, () => chargeEl.innerHTML = chargeDays[intervalIndex]);
    animateFadeForAction(deliveryEl, () => deliveryEl.innerHTML = deliveryDays[intervalIndex]);
    document.getElementById("nextchargedate").value = chargeDays[intervalIndex];
    document.getElementById("nextdeliverydate").value = deliveryDays[intervalIndex];
  };

  /*
   * Updates on box selection
   */
  const onSelect = async (ev) => {
    //const selectEl = document.getElementById("pauseinterval");
    ev.target.classList.add("mb3");
  };

  /**
   * The initial data of the form
   *
   * @function getInitialData
   * @returns {object} The initial data for the form
   * returns the box else compiles reasonable defaults.
   */
  const getInitialData = () => {
    const data = {
      attributes: JSON.stringify(subscription.attributes),
      includes: JSON.stringify(subscription.includes),
      properties: JSON.stringify(subscription.properties),
      pauseinterval: intervalDays[intervalIndex],
      nextchargedate: chargeDays[intervalIndex],
      nextdeliverydate: deliveryDays[intervalIndex],
      now: dateStringNow(),
      type: "paused",
      navigator: userNavigator(),
      admin: props.admin,
    };
    return data;
  };

  /**
   * The form fields - required by {@link module:app/form/form~Form|Form}.
   *
   * @member {object} fields The form fields keyed by field title string
   */
  const getFields = () => {

    return {
      attributes: {
        type: "hidden",
        datatype: "string",
      },
      type: {
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
      includes: {
        type: "hidden",
        datatype: "string",
      },
      properties: {
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
      pauseInterval: {
        label: "Select Pause Interval",
        type: "input-select",
        datatype: "string",
        datalist: intervalDays,
        required: true,
        onchange: onIntervalChange,
        onclick: onSelect,
      },
    };
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
        detail: { subscription_id: subscription.attributes.subscription_id },
      })
    );
    doSave();
  };

  for await (const _ of this) { // eslint-disable-line no-unused-vars

    /*
     * Data passed to form to create the toast message to user on doSave of form
     * These values can be arbitary provided that match the template string
     */
    const toastTemplate = {
      template: "${title} - ${variant} subscription has been queued for update.",
      title: subscription.box.shopify_title,
      variant: subscription.attributes.variant,
    };

    const deliveredObj = new Date(Date.parse(subscription.attributes.nextDeliveryDate));
    deliveredObj.setDate(deliveredObj.getDate() + interval);
    const updatedDelivery = deliveredObj.toDateString();

    const chargeObj = new Date(Date.parse(subscription.attributes.nextChargeDate));
    chargeObj.setDate(chargeObj.getDate() + interval);
    const updatedCharge = chargeObj.toDateString();

    yield (
      <div class="w-100 center">
        <p class="lh-copy tl mb3">
          Are you sure you want to pause the subscription?<br />
          <div class="dt dt--fixed w-100">
            <div class="dtc gray tr pr3 pv1 b">
              Scheduled delivery date:
            </div>
            <div class="dtc pv1 b">
              { subscription.attributes.nextDeliveryDate }
            </div>
          </div>
          <div class="dt dt--fixed w-100">
            <div class="dtc gray tr pr3 pv1 b">
              This charge date:
            </div>
            <div class="dtc pv1 b">
              { subscription.attributes.nextChargeDate }
            </div>
          </div>
        </p>
        <p class="lh-copy tl">
          <div class="dt dt--fixed w-100">
            <div class="dtc gray tr pr3 pv1 b">
              New delivery date will be:
            </div>
            <div class="dtc pv1 b" id="delivery-date">
              { deliveryDays[intervalIndex] }
            </div>
          </div>
          <div class="dt dt--fixed w-100">
            <div class="dtc gray tr pr3 pv1 b">
              New charge date will be:
            </div>
            <div class="dtc pv1 b" id="charge-date">
              { chargeDays[intervalIndex] }
            </div>
          </div>
        </p>
        <div class="w-80 center mb3">
          <Form
            data={getInitialData()}
            fields={getFields()}
            title={title}
            id={formId}
            meta={toastTemplate}
          />
        </div>
        <div class="w-100 center tr">
          <Button type="primary" onclick={thisSave}>
            Yes, Pause Subscription
          </Button>
          <Button type="secondary" onclick={closeModal}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }
}

/**
 * Wrapped component
 *
 * @member {object} SkipChargeModal
 */
export default FormModalWrapper(SkipCharge, options);

