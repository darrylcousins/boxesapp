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
import { Fetch } from "../lib/fetch";
import Error from "../lib/error";
import BarLoader from "../lib/bar-loader";
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
    <Button type="alt-warning-reverse" title="Cancel Box Subscription" name={name}>
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
  saveMsg: "Cancelling box subscription ... please be patient, it will take some minutes.",
  successMsg: "Cancellation has been queued, reloading ...",
  useSession: true, // set up socket.io to get feedback
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

  /*
   * Admin editable list of reason for cancellation
   */
  let cancelOptions = [];
  /**
   * Hold selected option
   *
   * @member {integer} selectedOptionId
   */
  let selectedOptionId = null;
  /**
   * Hold loading state.
   *
   * @member {boolean} loading
   */
  let loading = true;
  /**
   * Fetch errors
   *
   * @member {string} fetchError
   */
  let fetchError = false;
  /**
   * Form errors
   *
   * @member {string} formError
   */
  let formError = false;

  /**
   * Fetch current cancel options
   *
   * @function getBoxes
   */
  const getCancelOptions = async () => {
    let uri = `/api/recharge-get-cancel-options`;
    await Fetch(uri)
      .then(async (result) => {
        const { error, json } = result;
        if (error !== null) {
          fetchError = error;
          loading = false;
          this.refresh();
        } else {
          cancelOptions = json.options ? json.options : [];
          if (cancelOptions.length > 0) {
            cancelOptions.push("Or provide your own short reason ...");
          } else {
            cancelOptions.push("Please provide a short reason for cancellation");
            selectedOptionId = 0;
          }
          loading = false;
          await this.refresh();
        }
      })
      .catch((err) => {
        fetchError = err;
        loading = false;
        this.refresh();
      });
  };

  getCancelOptions();

  /**
   * Pick up selection on cancel options
   *
   * @function handleClick
   * @returns {null}
   */
  const handleClick = async (ev) => {
    formError = false;
    selectedOptionId = parseInt(ev.target.value);
    await this.refresh();
  };

  /**
   * Local save to perform actions before calling form-modal doSave
   *
   * @function thisSave
   * @returns {null}
   */
  const thisSave = () => {
    const form = document.forms[formId];
    if (selectedOptionId < cancelOptions.length - 1) {
      form.elements["cancellation_reason"].value = cancelOptions[selectedOptionId];
    };
    if (form.elements["cancellation_reason"].value === "") {
      formError = "Please provide a reason for cancellation.";
      this.refresh();
      return;
    };
    this.dispatchEvent(
      new CustomEvent("customer.disableevents", {
        bubbles: true,
        detail: { subscription_id: subscription.attributes.subscription_id },
      })
    );
    doSave();
  };

  for await (const _ of this) { // eslint-disable-line no-unused-vars

    /**
     * The form fields - required by {@link module:app/form/form~Form|Form}.
     *
     * @member {object} fields The form fields keyed by field title string
     */
    const getFields = () => {
      return {
        subscription_id: {
          type: "hidden",
          datatype: "string",
        },
        charge_id: {
          type: "hidden",
          datatype: "string",
        },
        includes: {
          type: "hidden",
          datatype: "string",
        },
        properties: {
          type: "hidden",
          datatype: "string",
        },
        attributes: {
          type: "hidden",
          datatype: "string",
        },
        updates: {
          type: "hidden",
          datatype: "string",
        },
        // keep hidden unless own entry is selected
        cancellation_reason: {
          label: "Please provide a short note for the cancellation",
          placeholder: `I no longer requires ${subscription.box.shopify_title} on ${subscription.attributes.variant}s.`,
          type: "text",
          required: selectedOptionId === cancelOptions.length - 1,
          valid: selectedOptionId !== cancelOptions.length - 1,
          size: 100,
          disabled: selectedOptionId !== cancelOptions.length - 1,
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
    };

    /**
     * The initial data of the form
     *
     * @function getInitialData
     * @returns {object} The initial data for the form
     * returns the box else compiles reasonable defaults.
     */
    const getInitialData = () => ({
      subscription_id: `${subscription.attributes.subscription_id}`,
      charge_id: `${subscription.attributes.charge_id}`,
      includes: JSON.stringify(subscription.includes),
      updates: JSON.stringify(subscription.updates),
      properties: JSON.stringify(subscription.properties),
      attributes: JSON.stringify(subscription.attributes),
      cancellation_reason: "",
      now: dateStringNow(),
      navigator: userNavigator(),
      admin: props.admin,
    });

    /*
     * Data passed to form to create the toast message to user on doSave of form
     * These values can be arbitary provided that match the template string
     */
    const toastTemplate = {
      template: "${title} - ${variant} subscription has been queued for cancellation.",
      title: subscription.box.shopify_title,
      variant: subscription.attributes.variant,
    };

    yield (
      <Fragment>
        { loading && <BarLoader /> }
        { fetchError && <Error msg={fetchError} /> }
        <p class="lh-copy tl">
          Are you sure you want to cancel this box subscription?<br />
          Perhaps you would prefer to <strong>pause</strong> the subscription instead?<br />
          Or perhaps you would prefer to <strong>change</strong> the subscription to a different box?<br />
          Once cancelled you will be able to <strong>reactivate</strong> it at any time.<br />
        </p>
        { !loading && (
          <Fragment>
            { formError && <Error msg={formError} /> }
            <ul class="list pl0">
              { cancelOptions.map((option, idx) => (
                <li class="mb1">
                  <label class="pointer items-center">
                    <input 
                      onclick={ handleClick }
                      checked={ selectedOptionId === idx }
                      class="mr2 ml3"
                      type="radio"
                      id={ `option-${idx}` }
                      value={ idx }
                      name={ `option-${idx}` } />
                      { option }
                  </label>
                </li>
              ))}
            </ul>
            <Form
              data={getInitialData()}
              fields={getFields(selectedOptionId)}
              title={title}
              id={formId}
              meta={toastTemplate}
              hideLabel={ true }
            />
            <div class="w-80 center mt3">
              <Button type="primary" onclick={thisSave}>
                Yes, Cancel Subscription
              </Button>
              <Button type="secondary" onclick={closeModal}>
                Cancel
              </Button>
            </div>
          </Fragment>
        )}
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


