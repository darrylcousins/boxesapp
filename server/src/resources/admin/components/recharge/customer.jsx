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
import { PostFetch, Fetch } from "../lib/fetch";
import { toastEvent } from "../lib/events";
import Toaster from "../lib/toaster";
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
   * Disallow edits to groups in this list
   *
   * @member {object} charge groups for the customer
   */
  let noEdits = [];

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
        if (json.reload) {
          // charge is too new so reload
          window.location.reload();
          return null;
        };
        chargeGroups = json.result;
        originalChargeGroups = cloneDeep(json.result);
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
    const uri = `/api/recharge-customer/${customer.id}`;
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
   * For reloading and cancelling changes
   *
   * @listens reloadSubscriptionEvent From Subscription
   */
  const reloadSubscription = (ev) => {
    loading = true;
    chargeGroups = [];
    this.refresh();

    setTimeout(() => {
      loading = false;
      chargeGroups = cloneDeep(originalChargeGroups);
      this.refresh();
      }, 
      1000);

    //getChargeGroups();
  };

  /**
   * For reloading cancelled changes
   *
   * @listens reloadSubscriptionEvent From Subscription
   */
  this.addEventListener("subscription.reload", reloadSubscription);

  /**
   * Update charge groups and remove the deleted subscription
   * We need to do it this way because of time delay from recharge api
   * @function removeSubscription
   * @listen subscription.deleted event
   */
  const removeSubscription = (ev) => {
    const result = ev.detail.result;
    const subscription = cancelledGroups.find(el => el.subscription_id === result.subscription_id);
    const idx = cancelledGroups.indexOf(subscription);
    cancelledGroups.splice(idx, 1);
    const div = document.querySelector(`#customer`);
    animateFadeForAction(div, () => this.refresh(), 800);
  };

  this.addEventListener("subscription.deleted", removeSubscription);

  /**
   * Update charge groups and remove the deleted subscription
   * We need to do it this way because of time delay from recharge api
   * @function removeSubscription
   * @listen subscription.deleted event
   */
  const reactivateSubscription = async (ev) => {
    const result = ev.detail.result;
    const subscription = cancelledGroups.find(el => el.subscription_id === `${result.subscription_id}`);
    const idx = cancelledGroups.indexOf(subscription);
    cancelledGroups.splice(idx, 1);
    loading = true;
    this.refresh();
    let headers = { "Content-Type": "application/json" };
    const src = `/api/recharge-reactivated-subscription`;
    const data = subscription;
    data.scheduled_at = result.scheduled_at;
    await PostFetch({ src, data, headers })
      .then((result) => {
        const { error, json } = result;
        if (error !== null) {
          fetchError = error;
          loading = false;
          this.refresh();
        };
        chargeGroups.push(json); // needs to be ordered
        sortChargeGroups();
        originalChargeGroups = cloneDeep(chargeGroups);
        loading = false;
        const div = document.querySelector(`#customer`);
        animateFadeForAction(div, () => this.refresh(), 800);
      })
      .catch((err) => {
        fetchError = err;
        loading = false;
        this.refresh();
      });
  };

  this.addEventListener("subscription.reactivated", reactivateSubscription);

  /**
   * Update charge groups and remove the deleted subscription
   * Then load into cancelledGroups
   * @function cancelSubscription
   * @listen subscription.cancelled event
   */
  const cancelSubscription = async (ev) => {
    const result = ev.detail.result;
    const subscription = chargeGroups.find(el => el.attributes.subscription_id === result.subscription_id);
    const idx = chargeGroups.indexOf(subscription);
    const ids = subscription.includes.map(el => el.subscription_id).join(",");
    chargeGroups.splice(idx, 1);
    originalChargeGroups = cloneDeep(chargeGroups);
    loading = true;
    this.refresh();
    let headers = { "Content-Type": "application/json" };
    const src = "/api/recharge-cancelled-subscriptions";
    const data = { ids };
    await PostFetch({ src, data, headers })
      .then((result) => {
        const { error, json } = result;
        if (error !== null) {
          fetchError = error;
          loading = false;
          this.refresh();
        } else {
          cancelledGroups.push(json[0]);
          loading = false;
          const subdiv = document.querySelector(`#customer`);
          animateFadeForAction(subdiv, () => this.refresh(), 800);
        }
      })
      .catch((err) => {
        fetchError = err;
        loading = false;
        this.refresh();
      });
  };

  this.addEventListener("subscription.cancelled", cancelSubscription);

  /**
   * When subscription dates have been changed
   * Update the updated subscription in chargeGroups
   * We need to do it this way because of time delay from recharge api
   * @function chargeUpdated
   * @listen subscription.updated event
   */
  const chargeUpdated = async (ev) => {

    const result = ev.detail.result;
    const { charge } = result;
    loading = true;
    this.refresh();
    let headers = { "Content-Type": "application/json" };
    const src = "/api/recharge-updated-charge-date";
    const data = { charge };
    await PostFetch({ src, data, headers })
      .then((res) => {
        const { error, json } = res;
        if (error !== null) {
          fetchError = error;
          chargeGroups = [];
          loading = false;
          this.refresh();
        } else {
          const subscription = chargeGroups.find(el => el.attributes.subscription_id === result.subscription_id);
          const idx = chargeGroups.indexOf(subscription);
          chargeGroups[idx] = json.subscription;
          sortChargeGroups();
          originalChargeGroups = cloneDeep(chargeGroups);
          loading = false;
          const subdiv = document.querySelector(`#customer`);
          animateFadeForAction(subdiv, () => this.refresh(), 800);
        }
      })
      .catch((err) => {
        fetchError = err;
        loading = false;
        this.refresh();
      });
  };

  this.addEventListener("subscription.updated", chargeUpdated);

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
  };;

  for await ({ customer } of this) { // eslint-disable-line no-unused-vars
    yield (
      <div id="customer-wrapper" class="pr3 pl3 w-100">
        { loading && <BarLoader /> }
        { loading && <div>Loading subscriptions ...</div> }
        { fetchError && <Error msg={fetchError} /> }
        <div id="customer">
          <Fragment>
            { admin && (
              <div 
                class="w-100 tr ml2 mr2 link bold pointer blue" 
                onclick={ getNewCustomer }>
                Load another customer
              </div>
            )}
            { chargeGroups && chargeGroups.length > 0 ? (
              <Fragment>
                <h6 class="tc mv4 w-100 navy b">
                  Active Subscriptions
                </h6>
                { chargeGroups.map((group, idx) => (
                  <div id={`subscription-${group.attributes.subscription_id}`}>
                    <Subscription subscription={ group } idx={ idx }
                      admin={ admin }
                      crank-key={ `${group.attributes.nextChargeDate.replace(/ /g, "_")}-${idx}` }
                      allowEdits={ !noEdits.includes(idx) } />
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
                      <Cancelled subscription={ group } idx={ idx } />
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
