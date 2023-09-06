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
   * @member {boolean} fetchSubscriptions
   */
  let fetchSubscriptions = [];
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
    let uri = `/api/recharge-get-subscriptions-by-date?date=${selectedDate}`;
    loading = true;
    this.refresh();
    await Fetch(encodeURI(uri))
      .then(async (result) => {
        const { error, json } = result;
        if (error !== null) {
          fetchError = error;
          loading = false;
          this.refresh();
        } else {
          fetchSubscriptions = json;
          console.log(fetchSubscriptions);
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
        fetchSubscriptions = [];
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
    // send the date to pause the subscriptions, the api will collect the
    // subscriptions required
    let src = `/api/recharge-bulk-pause-subscriptions`;
    loading = true;
    this.refresh();
    
    const headers = { "Content-Type": "application/json" };
    const data = { chargeDate: selectedDate, message: formData.message };

    const callback = async (data) => {
      console.log(data.session_id);
      await PostFetch({ src, data, headers })
        .then(async (result) => {
          const { error, json } = result;
          if (error !== null) {
            fetchError = error;
            loading = false;
            this.refresh();
          } else {
            console.log(json);
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

    await getSessionId(callback, data);
    // need a way to display emits
  };

  /**
   * Cancel
   */
  const cancelChanges = () => {
    fetchError = null;
    formError = null;
    fetchSubscriptions = [];
    selectedDate = null;
    formData.charge_date = "";
    formData.message = "";
    const socketMessages = document.getElementById("socketMessages");
    if (socketMessages) {
      socketMessages.innerHTML = "";
    };
    this.refresh();
  };

  /**
   * For messaging user
   */
  this.addEventListener("toastEvent", Toaster);

  for (const _ of this) { // eslint-disable-line no-unused-vars

    yield (
      <div id="bulk-pause" class="w-80 center pv2">
        { loading && <BarLoader /> }
        { fetchError && <Error msg={fetchError} /> }
        { formError && <Error msg={formError} /> }
        <div class="tl pb3">
          <h4 class="pt0 lh-title ma0 fg-streamside-maroon">
            Bulk Pause Subscriptions
          </h4>
          <div class="w-100">
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
            <div class="mt4 w-80">
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
          { (fetchSubscriptions.length > 0) && (
            <Fragment>
              <div class="cf dark-blue pa2 mt2 mb3 br3 ba b--dark-blue bg-washed-blue">
                The following subscriptions will be paused for 7 days. A
                standard email will be sent to each customer including the text
                provided here as a paragraph. The text provided should explain
                to the customer why the subscription has been paused.
              </div>
              <div class="w-100 cf">
                <Field
                  label={ `Compose a message to include in email to customer` }
                  hideLabel={false}
                  options={getFieldOptions("message")}
                  data={formData}
                  id={ "message" }
                  formElements={getFormElements()}
                />
              </div>
              <div class="mt2 w-100">
                <h4 class="pt0 lh-title ma0 fg-streamside-maroon">Selected Subscriptions</h4>
                <table id="customer-table" class="mt4 w-100 center" cellspacing="0">
                  <thead>
                    <tr>
                      <th class="fw6 bb b--black-20 tl pb3 pr3 bg-white">Customer</th>
                      <th class="fw6 bb b--black-20 tl pb3 pr3 bg-white">Email</th>
                      <th class="fw6 bb b--black-20 tl pb3 pr3 bg-white">Charge Id</th>
                      <th class="fw6 bb b--black-20 tl pb3 pr3 bg-white">Charge Date</th>
                    </tr>
                  </thead>
                  <tbody class="tl">
                    { fetchSubscriptions.map(el => (
                      <tr crank-key={ `${ el.recharge_id }` }>
                        <td class="pr1 pt1 bb b--black-20 v-top">
                          { el.first_name } { el.last_name }
                        </td>
                        <td class="pr1 pt1 bb b--black-20 v-top">
                          { el.email }
                        </td>
                        <td class="pr1 pt1 bb b--black-20 v-top">
                          { el.charge_list.map(arr => (
                              (arr[1] === selectedDate) && <div>{ arr[0] }</div>
                          ))}
                        </td>
                        <td class="pr1 pt1 bb b--black-20 v-top">
                          { el.charge_list.map(arr => (
                              (arr[1] === selectedDate) && <div>{ arr[1] }</div>
                          ))}
                        </td>
                      </tr>
                    ))}
                   </tbody>
                </table>
              </div>
              <div class="tr pr1 pv2 w-100">
                  <Button type="primary" onclick={pauseSubscriptions}>
                    Pause Subscriptions
                  </Button>
                  <Button type="secondary" onclick={cancelChanges}>
                    Cancel
                  </Button>
              </div>
            </Fragment>
          )}
        </div>
        <div id="socketMessages" class="tl"></div>
      </div>
    );
  };
};

export default BulkPauseSubscriptions;
