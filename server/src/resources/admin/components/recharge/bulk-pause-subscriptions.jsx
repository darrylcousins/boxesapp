/**
 * Creates element to render a page to pause mulitiple subscriptions
 *
 * @module app/components/recharge/bulk-pause-subscriptions
 * @exports CoreBoxModal
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment, Portal } from "@b9g/crank";
import { PostFetch, Fetch } from "../lib/fetch";
import Button from "../lib/button";
import Error from "../lib/error";
import BarLoader from "../lib/bar-loader";
import IconButton from "../lib/icon-button";
import Form from "../form";
import Field from "../form/fields";
import { toastEvent } from "../lib/events";
import Toaster from "../lib/toaster";
import { animateFadeForAction, isValidDateString } from "../helpers";
import { getSessionId } from "../socket";

/**
 * Creates element to render a page to bulk pause subscriptions
 *
 * @generator
 * @yields {Element} DOM element displaying modal
 * @param {object} props Property object
 *
 * Some thoughts.
 * 1. How to select subscriptions by delivery date (charge date = delivery date - 3 days)
 * 2. Need to be aware of fortnightly/weekly
 */
function* BulkPauseSubscriptions() {
  /**
   * Hold loading state.
   *
   * @member {boolean} loading
   */
  let loading = false;
  /**
   * Fetch errors
   *
   * @member {boolean} fetchError
   */
  let fetchError = null;
  /**
   * Form errors
   *
   * @member {boolean} formError
   */
  let formError = null;
  /**
   * Selected date
   *
   * @member {boolean} selectedDate
   */
  let selectedDate = null;
  /**
   * Fetched subscriptions
   *
   * @member {boolean} fetchCharges
   */
  let fetchCharges = [];
  /**
   * Form result received via socket.closed, remove messages and display list
   * of customer and subscription updated
   *
   * @member {boolean} formResult
   */
  let formResult = { updated: [] };
  /**
   * Selected subscriptions
   *
   * @member {boolean} selectedSubscriptions
   */
  let selectedCharges = [];
  /**
   * Name of messaging div
   *
   * @member {boolean} messageDivId
   */
  let messageDivId = "socketMessages";
  /**
   * Form data collected
   *
   * @member {object} formData
   */
  const formData = {
    charge_date: "",
    message: "",
  };
  /**
   * Form elements
   *
   * @member {object} formElements
   */
  const formElements = {};

  /**
   * Fetch the subscriptions
   *
   * @function getSubscriptions
   */
  const getSubscriptions = async () => {
    let uri = `/api/recharge-get-charges-by-date?date=${selectedDate}`;
    loading = true;
    fetchError = false;
    formResult.updated = [];
    const socketMessages = document.getElementById(messageDivId);
    if (socketMessages) {
      socketMessages.innerHTML = "";
    };
    this.refresh();
    await Fetch(encodeURI(uri))
      .then(async (result) => {
        const { error, json } = result;
        if (error !== null) {
          fetchError = error;
          loading = false;
          this.refresh();
        } else {
          fetchCharges = json;
          console.log(fetchCharges);
          loading = false;
          this.refresh();
        }
      })
      .catch((err) => {
        fetchError = err;
        loading = false;
        this.refresh();
      });
  };

  /**
   * Pick up all changes to form inputs, update formData object and refresh
   * component after refetching fields
   *
   * @function onChange
   * @returns {null}
   */
  const onChange = (ev) => {
    if (ev.target.id === "charge_date") {
      if (isValidDateString(ev.target.value)) {
        selectedDate = ev.target.value;
        fetchCharges = [];
        formError = null;
      } else {
        selectedDate = null;
        formError = `${ev.target.value} is not a valid date`;
      };
      formData.charge_date = selectedDate;
      formElements.charge_date.value = selectedDate;
    };
    if (ev.target.id === "message") {
      if (ev.target.value.length > 0) {
        formError = null;
      } else {
        formError = `${ev.target.value} is empty`;
      };
      formData.message = ev.target.value;
      formElements.charge_date.value = formData.message;
    };
    this.refresh();
  };

  /**
   * Field options
   */
  const getFieldOptions = (id) => {
    if (id === "charge_date") {
      return {
        id,
        type: "date",
        datatype: "string",
        size: "50",
        required: false,
        disabled: false,
        onchange: onChange,
        style: {"margin-bottom":"5px"},
      };
    };
    if (id === "message") {
      return {
        id,
        type: "textarea",
        size: "two-thirds",
        datatype: "string",
        onchange: onChange,
        required: true,
      };
    };
  };

  /**
   * Field element
   */
  const getFormElements = () => {
    formElements.charge_date = {};
    formElements.charge_date.value = formData.charge_date;
    formElements.charge_date.checkValidity = () => isValidDateString(selectedDate);
    formElements.message = {};
    formElements.message.value = formData.message;
    formElements.message.checkValidity = () => formData.message.length > 0;
    return formElements;
  };

  /**
   * Pause subscriptions
   */
  const pauseSubscriptions = async () => {
    if (formData.message.length === 0) {
      formError = "A message for customers is required";
      this.refresh();
      return;
    };
    if (selectedCharges.length === 0) {
      formError = "Please select at least one subscription";
      this.refresh();
      return;
    };
    // send the date to pause the subscriptions, the api will collect the
    // subscriptions required
    let src = `/api/recharge-bulk-pause-subscriptions`;
    loading = true;
    this.refresh();
    
    console.log(selectedCharges);
    const headers = { "Content-Type": "application/json" };
    const data = {
      chargeDate: selectedDate,
      message: formData.message,
      selectedCharges,
    };

    const callback = async (data) => {
      await PostFetch({ src, data, headers })
        .then(async (result) => {
          const { error, json } = result;
          if (error !== null) {
            fetchError = error;
            loading = false;
            this.refresh();
          } else {
            loading = false;
            this.refresh();
          }
        })
        .catch((err) => {
          fetchError = err;
          loading = false;
          this.refresh();
        });
    };

    await getSessionId(callback, data, messageDivId);
  };

  /**
   * Cancel
   */
  const cancelChanges = () => {
    fetchError = null;
    formError = null;
    fetchCharges = [];
    selectedDate = null;
    formData.charge_date = "";
    formData.message = "";
    const socketMessages = document.getElementById(messageDivId);
    if (socketMessages) {
      socketMessages.innerHTML = "";
    };
    this.refresh();
  };

  /**
   * Handle checkbox inputs
   */
  const handleSelection = (id) => {
    if (id) {
      if (selectedCharges.includes(id)) {
        selectedCharges.splice(selectedCharges.indexOf(id), 1);
      } else {
        selectedCharges.push(id);
      };
    } else {
      if (selectedCharges.length > 0) {
        selectedCharges = [];
      } else {
        selectedCharges = fetchCharges.map(el => el.charge_id);
      };
    };
    this.refresh();
  };

  /**
   * For messaging user
   */
  this.addEventListener("toastEvent", Toaster);

  /**
   * When the bulk task is completed and we receive a completion event
   */
  const socketClosed = (ev) => {
    // empty message div
    // log the ev.detail.updated customer: object, boxes: array of objects
    // customer: first_name, last_name, email
    // boxes, each: subscription_id, title, variant?
    const socketMessages = document.getElementById(messageDivId);
    if (socketMessages) {
      socketMessages.classList.add("closed"); // uses css transitions
      setTimeout(() => {
        socketMessages.innerHTML = "";
      }, 500);
    };
    formResult = {
      count,
      updated: ev.detail.updated,
    };
    selectedCharges = [];
    fetchCharges = [];
    setTimeout(() => {
      this.refresh();
    }, 500);
  };

  window.addEventListener("socket.closed", socketClosed);

  for (const _ of this) { // eslint-disable-line no-unused-vars

    yield (
      <div id="bulk-pause" class="w-80 center pv2 mh5">
        { loading && <BarLoader /> }
        { fetchError && <Error msg={fetchError} /> }
        { formError && <Error msg={formError} /> }
        <div class="tl pb3 w-100 center">
          <h4 class="pt0 lh-title ma0 fg-streamside-maroon">
            Bulk Pause Subscriptions
          </h4>
          <div>
            <Field
              label={ `Select subscriptions by charge date` }
              hideLabel={false}
              options={getFieldOptions("charge_date")}
              data={formData}
              id={ "charge_date" }
              formElements={getFormElements()}
            />
            <div class="cf" />
          </div>
          { selectedDate && (
            <div class="mt4">
              <div>Selected charge date:
                <span class="b mr4">{ new Date(Date.parse(selectedDate)).toDateString() }</span>
              </div>
              <div class="tr">
                <Button type="primary" onclick={getSubscriptions}>
                  Search
                </Button>
              </div>
            </div>
          )}
          { (fetchCharges.length > 0) && (
            <div class="mt4">
              <div class="alert-box cf dark-blue pa3 mt2 mb3 br3 ba b--dark-blue bg-washed-blue">
                The following subscriptions will be paused for 7 days. A
                standard email will be sent to each customer including the text
                provided here as a paragraph. The text should explain
                to the customer why the subscription has been paused.
              </div>
              <div class="cf">
                <Field
                  label={ `Compose a message to include in email to customer` }
                  hideLabel={false}
                  options={getFieldOptions("message")}
                  data={formData}
                  id={ "message" }
                  formElements={getFormElements()}
                />
              </div>
              <div class="mt2">
                <h4 class="pt0 lh-title ma0 fg-streamside-maroon">Selected Subscriptions</h4>
                <table id="customer-table" class="mt4 w-100 center" cellspacing="0">
                  <thead>
                    <tr>
                      <th class="fw6 bb b--black-20 tl pb3 pr3 bg-white" aria-label="Empty">
                        <div class="flex items-center mb1 dark-gray">
                          <input
                            type="checkbox"
                            name="selectAll"
                            checked={!(selectedCharges.length === 0)}
                            onchange={ () => handleSelection(null) }
                            id="select_all"
                          />
                        </div>
                        </th>
                      <th class="fw6 bb b--black-20 tl pb3 pr3 bg-white">Customer</th>
                      <th class="fw6 bb b--black-20 tl pb3 pr3 bg-white">Email</th>
                      <th class="fw6 bb b--black-20 tl pb3 pr3 bg-white">Charge Id</th>
                      <th class="fw6 bb b--black-20 tl pb3 pr3 bg-white">Box(es)</th>
                      <th class="fw6 bb b--black-20 tl pb3 pr3 bg-white">Charge Date</th>
                    </tr>
                  </thead>
                  <tbody class="tl">
                    { fetchCharges.map(el => (
                      <tr crank-key={ `${ el.charge_id }` }>
                        <td class="pr1 pv1 bb b--black-20 v-top">
                          <input
                            type="checkbox"
                            name="subscription[]"
                            checked={ selectedCharges.includes(el.charge_id) }
                            onchange={ () => handleSelection(el.charge_id) }
                            id={el.charge_id}
                          />
                        </td>
                        <td class="pr1 pv2 bb b--black-20 v-top">
                          { el.customer.first_name } { el.customer.last_name }
                        </td>
                        <td class="pr1 pv2 bb b--black-20 v-top">
                          { el.customer.email }
                        </td>
                        <td class="pr1 pv2 bb b--black-20 v-top">
                          { el.charge_id }
                        </td>
                        <td class="pr1 pv2 bb b--black-20 v-top">
                          { el.boxes.map(box => (
                            <Fragment>
                              <span>{ box.title }</span>{ " " }
                              <span>{ box.properties.find(el => el.name === "Delivery Date").value }</span>
                            </Fragment>
                          ))}
                        </td>
                        <td class="pr1 pv2 bb b--black-20 v-top">
                          { el.scheduled_at }
                        </td>
                      </tr>
                    ))}
                   </tbody>
                </table>
              </div>
              <div class="tr pr1 pv2 w-100">
                { selectedCharges.length > 0 && (
                  <Button type="primary" onclick={pauseSubscriptions}>
                    Pause Subscriptions
                  </Button>
                )}
                <Button type="secondary" onclick={cancelChanges}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
        <div id={ messageDivId } class="tl socketMessages"></div>
        { formResult.updated.length > 0 && (
          <Fragment>
            <p>The following {formResult.updated.length} subscriptions have been updated with new charge date: {selectedDate}</p>
            { formResult.updated.map(item => (
              <div class="dt dt--fixed w-100">
                <div class="dtc tl">
                  { `${item.customer.first_name} ${item.customer.last_name} <${item.customer.email}>` }
                </div>
                <div class="dtc tl">
                  { item.boxes.length === 0 ? (
                    <span class="b">Error!</span>
                  ) : (
                    <ul class="list mv2">
                    { item.boxes.map(box => (
                      <li>
                        { `${box.subscription_id} ${box.title} - ${new Date(box.delivery_at).toLocaleString("en", {weekday: "long"})}` }
                      </li>
                    ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </Fragment>
        )}
      </div>
    );
  };
};

export default BulkPauseSubscriptions;
