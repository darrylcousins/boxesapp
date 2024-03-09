/**
 * Creates element to render a list from the updates_pending table
 *
 * @module app/recharge/pending_updates
 * @requires module:app/recharge/pending_updates~PendingUpdates
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
import { reloadCustomers } from "./events";

/**
 * Create interface to present to administrator a list of items found in the updates_pending table
 *
 * When an update is made to a subscription by the admin or the customer an
 * entry is created in the updates_pending table that is used to prevent
 * further edits until the update is completed and the new charge created on
 * Recharge, at which time the entry should be deleted. As things stand in the
 * 2023 version these entries were sometimes not deleted. These entries are
 * picked up in the nightly verify_subscriptions script and included in an
 * email to the admin (along with other problems found).
 *
 * The interface presented here allows the administrator to see the entries,
 * take action if required, and remove the entry.
 *
 * In early 2024 more work is being done on verification of completion of
 * updates so hopefully at some point this will no longer be required.
 *
 * @generator
 * @yields {Element} - a html list
 */
async function* PendingUpdates({ pendingUpdates }) {
  
  /**
   * Maintain array of checked entries
   *
   * @member {boolean} checkedEntries
   */
  let checkedEntries = [];
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
   * Captures click event on checkboxes
   *
   * @function clickEvent
   * @param {object} ev Click event
   * @listens window.click
   */
  const clickEvent = async (ev) => {
    const name = ev.target.tagName;
    if (name === "INPUT") {
      if (ev.target.name.startsWith("selectAll")) {
        // select all
        if (ev.target.checked) {
          checkedEntries = pendingUpdates.map(el => el._id);
        } else {
          checkedEntries =[];
        };
        return this.refresh();
      };
      if (ev.target.name.startsWith("entry")) {
        if (ev.target.checked) {
          checkedEntries.push(ev.target.id);
        } else {
          const idx = checkedEntries.indexOf(ev.target.id);
          if (idx > -1) checkedEntries.splice(idx, 1);
        };
        return this.refresh();
      };
    };
  };

  document.addEventListener("click", clickEvent);

  /**
   * Remove the selected entries
   *
   * @function removeEntries
   */
  const removeEntries = async () => {
    let src = `/api/recharge-remove-pending-entries`;
    loading = true;
    await this.refresh();
    
    const headers = { "Content-Type": "application/json" };
    const data = {
      selectedEntries: checkedEntries
    };
    await PostFetch({ src, data, headers })
      .then(async (result) => {
        const { error, json } = result;
        if (error !== null) {
          fetchError = error;
          loading = false;
          this.refresh();
        } else {
          this.dispatchEvent(toastEvent({
            notice: `Deleted ${json.deletedCount} entries`,
            bgColour: "black",
            borderColour: "black"
          }));
          this.dispatchEvent(reloadCustomers());
          checkedEntries = [];
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
    yield (
      <div class="w-100 pv4 ph5 br3 ba b--black-20 bw1" id="updates_pending">
        <div class="center">
          <h5 class="fw5">Updates Pending</h5>
        </div>
        <p>
          The entries listed here also show up in the nightly <strong>verify subscriptions</strong> email. {" "}
          These entries are made when an update is being made to a subscription and are cleared once the update {" "}
          has been fully committed to <i class="b">Recharge</i>. In early 2024 some changes {" "}
          to the app have been made which should prevent these entries not being removed. However, for now the {" "}
          entries can be removed here.
        </p>
        { loading && <BarLoader /> }
        { fetchError && <Error msg={ fetchError } /> }
        <table id="updates-pending-table" class="mt4 w-100 center" cellspacing="0">
          { pendingUpdates && pendingUpdates.length > 0 && (
            <Fragment>
              <thead>
                <tr>
                  <th class="fw6 bb b--black-20 tl pb3 pr1">
                    <input
                      type="checkbox"
                      name="selectAll"
                      checked={!(checkedEntries.length === 0)}
                      id="select_all"
                      title={ checkedEntries.length === 0 ? "Select All" : "Deselect All" }
                    />
                  </th>
                  <th class="fw6 bb b--black-20 tl pb3 pr3">Customer</th>
                  <th class="fw6 bb b--black-20 tl pb3 pr3">Subscription</th>
                  <th class="fw6 bb b--black-20 tl pb3 pr3">Box</th>
                  <th class="fw6 bb b--black-20 tl pb3 pr3">Label</th>
                  <th class="fw6 bb b--black-20 tl pb3 pr3">Created</th>
                </tr>
              </thead>
              <tbody class="tl">
                { pendingUpdates.map((entry, idx) => (
                  <tr crank-key={ `${ entry.customer_id }-${ entry.subscription_id }` }>
                    <td class="pr3 pt1 bb b--black-20 v-top">
                      <div class="w-100">
                        <input
                          type="checkbox"
                          name="entry[]"
                          checked={checkedEntries.includes(entry._id)}
                          id={entry._id}
                        />
                      </div>
                    </td>
                    <td class="pr3 pt1 bb b--black-20 v-top">
                      <div class="w-100">
                        { entry.customer.first_name } { entry.customer.last_name }
                      </div>
                    </td>
                    <td class="pr3 pt1 bb b--black-20 v-top">
                      <div class="w-100">
                        { entry.subscription_id }
                      </div>
                    </td>
                    <td class="pr3 pt1 bb b--black-20 v-top">
                      <div class="w-100">
                        { entry.title }
                      </div>
                    </td>
                    <td class="pr3 pt1 bb b--black-20 v-top">
                      <div class="w-100">
                        { entry.action }
                      </div>
                    </td>
                    <td class="pr3 pt1 bb b--black-20 v-top">
                      <div class="w-100">
                        { dateString(entry.timestamp) }
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Fragment>
          )}
        </table>
        { checkedEntries.length > 0 && (
          <div class="tr mt3">
            <Button type="primary" onclick={async () => await removeEntries() }>
              Remove entries
            </Button>
          </div>
        )}
      </div>
    );
  };
};

export default PendingUpdates;
