/**
 * Makes customer component
 *
 * @module app/recharge/customer
 * @exports Customer
 * @requires module:app/recharge/customer
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment } from "@b9g/crank";
import Subscription from "./subscription";
import Error from "../lib/error";
import { Fetch } from "../lib/fetch";
import { toastEvent } from "../lib/events";
import Toaster from "../lib/toaster";
import BarLoader from "../lib/bar-loader";
import { loadAnotherCustomer } from "./events";

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
   * charge groups fetched from api
   *
   * @member {object} charge groups for the customer
   */
  let chargeGroups = null;

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
   *
   */
  const getChargeGroups = async () => {
    const uri = `/api/recharge-customer-charges/${customer.id}`;
    return Fetch(encodeURI(uri))
      .then((result) => {
        const { error, json } = result;
        if (error !== null) {
          fetchError = error;
          loading = false;
          this.refresh();
          return null;
        };
        chargeGroups = json;
        console.log(chargeGroups);
        loading = false;
        this.refresh();
      })
      .catch((err) => {
        fetchError = err;
        loading = false;
        this.refresh();
      });
  };

  getChargeGroups();

  const reloadSubscription = () => {
    loading = true;
    chargeGroups = null;
    this.refresh();
    getChargeGroups();
  };

  /**
   * For reloading and cancelling changes
   *
   * @listens reloadSubscriptionEvent From Subscription
   */
  this.addEventListener("reloadSubscriptionEvent", reloadSubscription);

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
              <Fragment>
                <Subscription subscription={ group } idx={ idx } />
              </Fragment>
            ))}
            </Fragment>
          ) : (
            <div class="w-100">
              <div class="mw6 center pt3">
                No subscriptions found for { customer }.
              </div>
            </div>
          )
        )}
      </div>
    )
  };
};

export default Customer;
