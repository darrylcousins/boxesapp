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
import { toastEvent } from "../lib/events";
import Toaster from "../lib/toaster";
import BarLoader from "../lib/bar-loader";
import { loadAnotherCustomer } from "./events";
import { animateFadeForAction } from "../helpers";

import EditProducts from "../products/edit-products";
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
  let chargeGroups = null;
  /**
   * cancelled groups fetched from api
   *
   * @member {object} cancelled subscriptions for the customer
   */
  let cancelledGroups = null;
  /**
   * charge groups fetched from api
   *
   * @member {object} charge groups for the customer
   */
  let originalChargeGroups = null;
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

  getRechargeCustomer().then(res => {
    const customer_id = res.id;
    if (res) {
      getChargeGroups(customer_id).then(result => {
        loading = true;
        this.refresh();
        getCancelledGroups(customer_id);
      });
    };
  });

  const reloadSubscription = (ev) => {
    const subscription = chargeGroups.find(el => el.attributes.subscription_id === ev.detail.id);
    const idx = chargeGroups.indexOf(subscription);
    loading = true;
    chargeGroups = null;
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
   * For reloading and cancelling changes
   *
   * @listens reloadSubscriptionEvent From Subscription
   */
  this.addEventListener("subscription.reload", reloadSubscription);

  /**
   * Update charge groups and remove the cancelled subscription
   * We need to do it this way because of time delay from recharge api
   * @function subscriptionCancelled
   * @listen subscription.cancelled event
   */
  const removeSubscription = (ev) => {
    const subscription = chargeGroups.find(el => el.attributes.subscription_id === ev.detail.id);
    const idx = chargeGroups.indexOf(subscription);
    chargeGroups.splice(idx, 1);
    this.refresh();
  };

  this.addEventListener("subscription.cancelled", removeSubscription);

  /**
   * Update the skipped subscription in chargeGroups
   * We need to do it this way because of time delay from recharge api
   * @function subscriptionSkipped
   * @listen subscription.skipped event
   */
  const skipCharge = async (ev) => {

    const result = ev.detail.result;
    const subscription = chargeGroups.find(el => el.attributes.subscription_id === ev.detail.id);
    const idx = chargeGroups.indexOf(subscription);

    subscription.attributes.nextDeliveryDate = ev.detail.result.nextdeliverydate;
    subscription.attributes.nextChargeDate = ev.detail.result.nextchargedate;

    // simply disable edits - when customer comes back to the page then the recharge data will be saved 
    subscription.attributes.hasNextBox = false;
    chargeGroups[idx] = subscription;

    noEdits.push(idx);

    const subdiv = document.querySelector(`#subscription-${ev.detail.id}`);
    if (subdiv) {
      animateFadeForAction(subdiv, () => this.refresh());
    } else {
      this.refresh();
    };
  };

  this.addEventListener("subscription.skipped", skipCharge);

  for await ({ customer } of this) { // eslint-disable-line no-unused-vars
    yield (
      <div id="customer" class="pr3 pl3 w-100">
        { loading && <BarLoader /> }
        { loading && <div>Loading subscriptions ...</div> }
        { fetchError && <Error msg={fetchError} /> }
        { admin && (
          <div 
            class="w-100 tr ml2 mr2 link bold pointer blue" 
            onclick={ getNewCustomer }>
            Load another customer
          </div>
        )}
        { chargeGroups && (
          chargeGroups.length > 0 ? (
            <Fragment>
            { chargeGroups.map((group, idx) => (
              <div id={`subscription-${group.attributes.subscription_id}`}>
                <Subscription subscription={ group } idx={ idx } allowEdits={ !noEdits.includes(idx) } />
              </div>
            ))}
            </Fragment>
          ) : (
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
              <h6 class="tl mb2 w-100 navy">
                Cancelled Subscriptions
              </h6>
              { cancelledGroups.map((group, idx) => (
                <div id={`cancelled-${group.subscription_id}`}>
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
      </div>
    )
  };
};

export default Customer;
