/**
 * Creates element to render result of veification of subscriptions
 *
 * @module app/recharge/verify-subscriptions
 * @requires module:app/recharge/verify-subscriptions~VerifySubscriptions
 * @exports PendingUpdates
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment } from "@b9g/crank";
import BarLoader from "../lib/bar-loader";
import Error from "../lib/error";
import Button from "../lib/button";
import { Fetch, PostFetch } from "../lib/fetch";
import { toastEvent } from "../lib/events";
import Toaster from "../lib/toaster";
import DTable from "./dtable";
import { reloadCustomers } from "./events";

/**
 * Create interface to present to administrator a list of items found in verify subscriptions nightly script
 *
 * The interface presented here allows the administrator to see the entries,
 * take action if required, re-verify, and remove the entry.
 *
 * @generator
 * @yields {Element} - a html list
 * @params customers - list of [ customers: { dateMistaches, orphans } ]
 */
async function* VerifySubscriptions({ customers }) {
  
  /**
   * Loading flag when sending update
   *
   * @member {bool} loading
   */
  let loading = null;
  /**
   * If the post update fails
   *
   * @member {object|string} fetchError
   */
  let fetchError = null;

  /*
   * Helper method for tidy date strings from timestamp
   */
  const dateString = (t) => {
    const date = new Date(t);
    return `${date.toDateString()} ${date.toLocaleTimeString()}`;
  };

  /**
   * Run the subscription verification script
   *
   * @function verifyCustomerSubscriptions
   */
  const verifyCustomerSubscriptions = async ( { customer } ) => {
    console.log(customer);
    let src = `/api/recharge-verify-customer-subscriptions`;
    loading = true;
    await this.refresh();
    
    const headers = { "Content-Type": "application/json" };
    const data = {
      customer
    };
    await PostFetch({ src, data, headers })
      .then(async (result) => {
        const { error, json } = result;
        if (error !== null) {
          fetchError = error;
          loading = false;
          this.refresh();
        } else {

          const idx = customers.findIndex(el => el.customer_id === customer.recharge_id);

          if (Object.hasOwnProperty.call(json, "verified")) {
            // passed verification
            this.dispatchEvent(toastEvent({
              notice: `Passed verification`,
              bgColour: "black",
              borderColour: "black"
            }));
            // remove entries, clean up
            customers.splice(idx, 1);
          } else {
            // failed to verify, update orphans and date_mismatches
            this.dispatchEvent(toastEvent({
              notice: `Failed verification`,
              bgColour: "black",
              borderColour: "black"
            }));
            // and update orphans and date_mismatch arrays
            customers[idx].orphans = json.orphans;
            customers[idx].date_mismatch = json.date_mismatch;
            customers[idx].price_mismatch = json.price_mismatch;
            customers[idx].timestamp = json.timestamp;
          };
          // get customer in array
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

  for await (const props of this) { // eslint-disable-line no-unused-vars
    if (customers && customers.length) {
    yield (
      <div class="w-100 pv4 ph5 br3 ba b--black-20 bw1" id="updates_pending" style="border-top: 3px red solid">
        <div class="center">
          <h4 class="fw5 black">Verify Subscriptions</h4>
        </div>
        <p>
          These entries of date mismatches and orphans have been found by the verificaton script run each night, the results { " " }
          of which have also been emailed to the administrator's email address. { " " }
          After addressing the problems found the customer's subscriptions can be re-verified by clicking the <b>verify</b> button.
        </p>
        <p>
          <strong>Date mismatches:</strong> If the charge date does not fall 3 days prior to the delivery date then it will { " " }
          be entered here and the dates will need to be corrected before it will pass verification.
        </p>
        <p>
          <strong>Orphans:</strong> Any subscribed products that are not included in a box subscription as an addon or { " " }
          an extra item then it will show up here. This will need to be resolved before it will pass verification.
        </p>
        <p>
          <strong>Price mismatches:</strong> Any subscribed boxes whose price does not match the actual shop price will show up here. This will need to be resolved before it will pass verification.
        </p>
        { loading && (
          <div class="mb2">
            <BarLoader />
          </div>
        )}
        { fetchError && <Error msg={ fetchError } /> }
        { customers && customers.length > 0 && (
          customers.map((entry, idx) => (
            <div class="w-100 pv4 ph5 br3 ba b--black-20 bw1" id={ `${entry.customer.last_name}-${idx}` }>
              <div class="cf" />
              <div class="f3 b">
                { entry.customer.first_name } {entry.customer.last_name } &lt;{ entry.customer.email }&gt; { " " }
              </div>
              <div class="pt3 mb5">
                <div class="fl">
                  Entry created at { dateString(entry.timestamp) }.
                </div>
                <div class="fr">
                  <Button type="primary" onclick={async () => await verifyCustomerSubscriptions({ customer: entry.customer }) }>
                    Verify
                  </Button>
                </div>
              </div>
              <div class="cf" />
              { entry.date_mismatch && entry.date_mismatch.length > 0 && (
                <DTable items={ entry.date_mismatch } title="Date mismatches" />
              )}
              <div class="cf" />
              { entry.orphans && entry.orphans.length > 0 && (
                <DTable items={ entry.orphans } title="Orphaned items" />
              )}
              <div class="cf" />
              { entry.price_mismatch && entry.price_mismatch.length > 0 && (
                <DTable items={ entry.price_mismatch } title="Price mismatches" />
              )}
              <div class="cf" />
            </div>
          ))
        )}
      </div>
    );
    } else {
      yield "";
    };
  };
};

export default VerifySubscriptions;
