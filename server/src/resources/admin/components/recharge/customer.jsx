/**
 * Makes customer component
 *
 * @module app/recharge/customer
 * @exports Customer
 * @requires module:app/recharge/customer
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment } from "@b9g/crank";
import cloneDeep from "lodash.clonedeep";
import Cancelled from "./cancelled";
import Subscription from "./subscription";
import Error from "../lib/error";
import { Fetch } from "../lib/fetch";
import BarLoader from "../lib/bar-loader";
import { loadAnotherCustomer } from "./events";
import { animateFadeForAction, delay } from "../helpers";

/**
 * Customer
 *
 * @function
 * @param {object} props Props
 * @param {object} props.customer Recharge customer id
 * @yields Element
 * @example
 * import {renderer} from '@b9g/crank/dom';
 * renderer.render(<Customer customer={customer} />, document.querySelector('#app'))
 */
async function *Customer({ customer, admin }) {

  /**
   * True while loading data from api
   *
   * @member {boolean} loading
   */
  let loading = true;
  /**
   * Messages received from api customer-charges
   *
   * @member {string} messages
   */
  let messages = "";
  /**
   * Messages received from api customer-charges
   *
   * @member {string} messages
   */
  let errors = "";
  /**
   * Fetch errors
   *
   * @member {boolean} fetchError
   */
  let fetchError = false;
  /**
   * recharge customer fetched from api
   *
   * @member {object} recharge customer
   */
  let rechargeCustomer = null;
  /**
   * charge groups fetched from api
   *
   * @member {object} charge groups for the customer
   */
  let chargeGroups = [];
  /**
   * cancelled groups fetched from api
   *
   * @member {object} cancelled subscriptions for the customer
   */
  let cancelledGroups = [];
  /**
   * charge groups fetched from api
   *
   * @member {object} charge groups for the customer
   */
  let originalChargeGroups = [];

  /**
   * Return to customer search
   *
   * @function getNewCustomer
   */
  const getNewCustomer = () => {
    this.dispatchEvent(loadAnotherCustomer());
  };

  /**
   * @function sortChargeGroups
   * Sort groups by next_scheduled_at
   *
   */
  const sortChargeGroups = () => {
    chargeGroups.sort((a, b) => {
      let dateA = new Date(Date.parse(a.attributes.nextChargeDate));
      let dateB = new Date(Date.parse(b.attributes.nextChargeDate));
      if (dateA < dateB) return -1;
      if (dateA > dateB) return 1;
      return 0;
    });
  };

  /**
   *
   * @function getChargeGroups
   * Get charges for customer
   *
   */
  const getChargeGroups = async (customer_id) => {
    const uri = `/api/recharge-customer-charges/${customer_id}`;

    return Fetch(encodeURI(uri))
      .then((result) => {
        const { error, json } = result;
        if (error !== null) {
          fetchError = error;
          loading = false;
          this.refresh();
          return null;
        };
        if (Object.hasOwnProperty.call(json, "message")) {
          messages = json.message;
        };
        if (Object.hasOwnProperty.call(json, "errors")) {
          errors = json.errors;
        };
        if (Object.hasOwnProperty.call(json, "result")) {
          chargeGroups = json.result;
          originalChargeGroups = cloneDeep(json.result);
        };
        loading = false;
        this.refresh();
        return true;
      })
      .catch((err) => {
        fetchError = err;
        loading = false;
        this.refresh();
        return null;
      });
  };

  /**
   *
   * @function getCancelledGroups
   * Get cancelled subscriptions for customer grouped as for charges
   *
   */
  const getCancelledGroups = async (customer_id) => {
    const uri = `/api/recharge-cancelled-subscriptions/${customer_id}`;
    return Fetch(encodeURI(uri))
      .then((result) => {
        const { error, json } = result;
        if (error !== null) {
          fetchError = error;
          loading = false;
          this.refresh();
          return null;
        };
        cancelledGroups = json;
        loading = false;
        this.refresh();
      })
      .catch((err) => {
        fetchError = err;
        loading = false;
        this.refresh();
      });
  };

  /**
   *
   * @function getRechargeCustomer
   * Get the recharge customer using shopify customer id
   *
   */
  const getRechargeCustomer = async () => {
    // recharge customer id
    const uri = `/api/recharge-customer?shopify_customer_id=${customer.id}`;
    return Fetch(encodeURI(uri))
      .then((result) => {
        const { error, json } = result;
        if (error !== null) {
          fetchError = error;
          loading = false;
          this.refresh();
          return null;
        };
        rechargeCustomer = json;
        if (!Object.hasOwnProperty.call(customer, "email")) {
          // in customer portal we only have the shopify customer id
          customer.email = rechargeCustomer.email;
          customer.first_name = rechargeCustomer.first_name;
          customer.last_name = rechargeCustomer.last_name;
        };
        return rechargeCustomer
      })
      .catch((err) => {
        fetchError = err;
        loading = false;
        this.refresh();
        return null;
      });
  };


  /**
   * Update charge groups and remove the deleted subscription
   * @function removeSubscription
   * @listen subscription.deleted event
   */
  const removeSubscription = (ev) => {
    const { subscription, subscription_id } = ev.detail
    const deleted = cancelledGroups.find(el => el.box.id === subscription_id);
    const idx = cancelledGroups.indexOf(deleted);
    cancelledGroups.splice(idx, 1);
    let subscription_ids = [ ...chargeGroups.map(el => el.attributes.subscription_id), ...cancelledGroups.map(el => el.box.id) ];
    for (const id of subscription_ids) {
      const div = document.querySelector(`#subscription-${id}`);
      div.classList.remove("disableevents");
    };
    const div = document.querySelector(`#customer`);
    animateFadeForAction(div, async () => await this.refresh(), 800);
  };

  this.addEventListener("subscription.deleted", removeSubscription);

  /**
   * Move the reactivated subscription to chargeGroups
   * @function reactivateSubscription
   * @listen subscription.deleted event
   */
  const reactivateSubscription = async (ev) => {
    const { subscription, subscription_id } = ev.detail
    const cancelled = cancelledGroups.find(el => el.box.id === subscription_id);
    const idx = cancelledGroups.indexOf(cancelled);
    cancelledGroups.splice(idx, 1);
    chargeGroups.push(subscription);
    originalChargeGroups = cloneDeep(chargeGroups); // save for cancel event
    let subscription_ids = [ ...chargeGroups.map(el => el.attributes.subscription_id), ...cancelledGroups.map(el => el.box.id) ];
    for (const id of subscription_ids) {
      const div = document.querySelector(`#subscription-${id}`);
      div.classList.remove("disableevents");
    };
    const div = document.querySelector(`#customer`);
    animateFadeForAction(div, async () => await this.refresh(), 800);
  };

  this.addEventListener("subscription.reactivated", reactivateSubscription);

  /**
   * Move the cancelled subscription to cancelledGroups
   * @function cancelSubscription
   * @listen subscription.cancelled event
   */
  const cancelSubscription = async (ev) => {
    const { subscription, subscription_id } = ev.detail
    const charge = chargeGroups.find(el => el.attributes.subscription_id === subscription_id);
    const idx = chargeGroups.indexOf(charge);
    chargeGroups.splice(idx, 1);
    originalChargeGroups = cloneDeep(chargeGroups); // save for cancel event
    cancelledGroups.push(subscription);
    let subscription_ids = [ ...chargeGroups.map(el => el.attributes.subscription_id), ...cancelledGroups.map(el => el.box.id) ];
    for (const id of subscription_ids) {
      const div = document.querySelector(`#subscription-${id}`);
      div.classList.remove("disableevents");
    };
    const div = document.querySelector(`#customer`);
    animateFadeForAction(div, async () => await this.refresh(), 800);
  };

  this.addEventListener("subscription.cancelled", cancelSubscription);

  /**
   * Disable all events on subscription objects not including the current
   * @function disableEvents
   * @listen subscription.editing event
   */
  const disableEvents = async (ev) => {
    const { subscription_id } = ev.detail;
    let subscription_ids = [ ...chargeGroups.map(el => el.attributes.subscription_id), ...cancelledGroups.map(el => el.box.id) ];
    subscription_ids = subscription_ids.filter(el => el !== subscription_id);
    for (const id of subscription_ids) {
      const div = document.querySelector(`#subscription-${id}`);
      div.classList.add("disableevents");
    };
  };

  this.addEventListener("customer.disableevents", disableEvents);

  /**
   * Enable all events on subscription objects not including the current
   * @function enableEvents
   * @listen subscription.editing event
   */
  const enableEvents = async (ev) => {
    const { subscription_id } = ev.detail;
    let subscription_ids = [ ...chargeGroups.map(el => el.attributes.subscription_id), ...cancelledGroups.map(el => el.box.id) ];
    subscription_ids = subscription_ids.filter(el => el !== subscription_id);
    for (const id of subscription_ids) {
      const div = document.querySelector(`#subscription-${id}`);
      div.classList.remove("disableevents");
    };
  };

  this.addEventListener("customer.enableevents", enableEvents);

  /**
   * For reloading and cancelling changes
   * Simple reverts all changes.
   *
   * @listens customer.reload From Subscription "cancel" changes button
   */
  const reloadAll = (ev) => {
    loading = true;
    chargeGroups = [];
    this.refresh();

    setTimeout(() => {
      loading = false;
      chargeGroups = cloneDeep(originalChargeGroups);
      this.refresh();
      }, 
      500);
  };

  this.addEventListener("customer.reload", reloadAll);

  if (!Object.hasOwnProperty.call(customer, "external_customer_id")) {
    await getRechargeCustomer().then(res => {
      if (res) {
        getChargeGroups(res.id).then(result => {
          loading = true;
          this.refresh();
          getCancelledGroups(res.id);
        });
      };
    });
  } else {
    rechargeCustomer = customer;
    getChargeGroups(customer.id).then(result => {
      loading = true;
      this.refresh();
      getCancelledGroups(customer.id);
    });
  };

  const adminUrl = `https://${window.location.hostname}/admin/customers`;

  for await ({ customer } of this) { // eslint-disable-line no-unused-vars
    yield (
      <div id="customer-wrapper" class="pr3 pl3 w-100">
        { loading && <BarLoader /> }
        { loading && <div>Loading subscriptions ...</div> }
        { fetchError && <Error msg={fetchError} /> }
        <div id="customer">
          <Fragment>
            { admin && (
              <Fragment>
                <div
                  class="w-100 tr ml2 mr2 link bold pointer fg-streamside-blue"
                  title="Load another customer"
                  onclick={ getNewCustomer }>
                  Load another customer
                </div>
                <a
                  class="db w-100 tr ml2 mr2 link bold pointer fg-streamside-blue"
                  target="_blank"
                  href={ `${adminUrl}/${customer.external_customer_id.ecommerce}` }>
                  View customer in Shopify
                </a>
              </Fragment>
            )}
            { messages.length > 0 && (
              <div class="dark-blue pa2 ma2 br3 ba b--dark-blue bg-washed-blue">
                  <p>{ messages }</p>
              </div>
            )}
            { errors.length > 0 && (
              <div class="dark-red mv2 pt2 pl2 br3 ba b--dark-red bg-washed-red">
                { errors.split("\n").map(el => el.trim()).filter(el => el !== "").map(message => (
                  <p style="margin-bottom:5px">{ message }</p>
                ))}
                { errors.split("\n").map(el => el.trim()).filter(el => el !== "").length > 1 && (
                  <p class="" style="margin-bottom:5px">
                    We have a problem! This may be because updates are still pending, { " " }
                    but if you continue to see this message then please contact the <a
                      class="b link dark-red underline"
                      href={ `mailto:${localStorage.getItem("admin_email")}` }>shop administrator</a></p>
                )}
              </div>
            )}
            { chargeGroups && chargeGroups.length > 0 ? (
              <Fragment>
                <h6 class="tc mv4 w-100 navy b">
                  Active Subscriptions
                </h6>
                { chargeGroups.map((group, idx) => (
                  <div id={`subscription-${group.attributes.subscription_id}`}>
                    <Subscription
                      subscription={ group } idx={ idx }
                      customer={ customer }
                      admin={ admin }
                      crank-key={ `${group.attributes.nextChargeDate.replace(/ /g, "_")}-${idx}` }
                    />
                  </div>
                ))}
              </Fragment>
            ) : (
              !loading && cancelledGroups && cancelledGroups.length === 0 && (
                <div class="w-100">
                  <div class="mw6 center pt3">
                    No subscriptions found.
                  </div>
                </div>
              )
            )}
            { cancelledGroups && (
              cancelledGroups.length > 0 ? (
                <Fragment>
                  <h6 class="tc mv4 w-100 navy b">
                    Cancelled Subscriptions
                  </h6>
                  { cancelledGroups.map((group, idx) => (
                    <div id={`subscription-${group.subscription_id}`}>
                      <Cancelled subscription={ group } customer={ customer } idx={ idx } />
                    </div>
                  ))}
                </Fragment>
              ) : (
                <div class="w-100">
                  <div class="mw6 center pt3">
                    &nbsp;
                  </div>
                </div>
              )
            )}
          </Fragment>
        </div>
      </div>
    )
  };
};

export default Customer;
