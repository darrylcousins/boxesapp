/**
 * Creates element to render cancelled subscriptions
 *
 * @module app/components/recharge/cancelled
 * @exports Cancelled
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment } from "@b9g/crank";
import { Fetch, PostFetch } from "../lib/fetch";
import { toastEvent } from "../lib/events";
import Toaster from "../lib/toaster";
import Timer from "../lib/timer";
import Error from "../lib/error";
import BarLoader from "../lib/bar-loader";
import ProgressLoader from "../lib/progress-loader";
import ReactivateSubscriptionModal from "./reactivate-modal";
import DeleteSubscriptionModal from "./delete-modal";
import Subscription from "./subscription";
import {
  completedActions,
  formatCount,
  findTimeTaken,
  displayMessages,
  sleepUntil,
  delay,
  toPrice,
  animateFadeForAction,
  animateFade
} from "../helpers";

/**
 * Render a cancelled subscription
 *
 */
async function* Cancelled({ subscription, customer, idx, admin, completedAction }) {

  console.log(subscription);
  /**
   * True while loading data from api
   * Starts false until search term submitted
   *
   * @member {boolean} loading
   */
  let loading = false;
  /**
   * The fetch error if any
   *
   * @member {object|string} fetchError
   */
  let fetchError = null;
  /**
   * timer
   *
   * @member {object} Keeping a track of how long updated take
   */
  let timer = null;
  /**
   * loadingSession
   *
   * @member {object} Keeping a track of the session_id
   */
  let loadingSession = null;
  /**
   * A save has been done so don't allow edits
   *
   * @member {object|string} editsPending
   */
  let editsPending = false;
  /**
   * Name of messaging div
   *
   * @member {boolean} messageDivId
   */
  let messageDivId = `socketMessagesCancelled-${subscription.subscription_id}`;

  /**
   * Helper method to pick up messages from other components
   *
   * @function makeTitle
   */
  const collectMessages = async (ev) => {
    await sleepUntil(() => document.getElementById(`displayMessages-${subscription.subscription_id}`))
     .then(res => {
        displayMessages(res, ev.detail.messages);
     })
     .catch(e => console.log(e));

  };

  this.addEventListener("subscription.messages", collectMessages);

  const pricedItems = () => {
    const result = [];
    result.push({
      title: subscription.box.product_title,
      price: subscription.box.price,
      count: subscription.box.quantity,
      total_price: toPrice(subscription.box.quantity * parseFloat(subscription.box.price) * 100),
    });
    for (const item of subscription.included) {
      result.push({
        title: item.product_title,
        price: item.price,
        count: item.quantity,
        total_price: toPrice(item.quantity * parseFloat(item.price) * 100),
      });
    };
    return result;
  };

  /**
   * @function listingReload
   * @listens listing.reload
   */
  const listingReload = async (ev) => {
    const result = ev.detail.json; // success, action, subscription_id
    // start the timer
    timer = new Date();
    loadingSession = ev.detail.session_id;
    ev.stopPropagation();
    editsPending = true; // on deletes no need to start timer for reload
    await this.refresh();
    return;
  };

  this.addEventListener("listing.reload", listingReload);

  this.addEventListener("toastEvent", Toaster);

  /*
   * @function reloadSubscription
   * Reload this particular charge from the server as a 'subsciption' object
   * @listens socket.closed
   */
  const reloadSubscription = async (ev) => {
    /*
    if (ev.detail.subscription_id !== parseInt(subscription.subscription_id)) {
      return;
    };
    */
    if (ev.detail.session_id !== loadingSession) return;
    ev.stopPropagation();
    if (timer) {
      const timeTaken = findTimeTaken(timer);
      timer = null;
      this.dispatchEvent(toastEvent({
        notice: `Updates (${ev.detail.action}) completed after ${timeTaken} minutes` ,
        bgColour: "black",
        borderColour: "black"
      }));
    };
    const socketMessages = document.getElementById(messageDivId);
    const saveMessages = document.getElementById(`saveMessages-${subscription.subscription_id }`);

    // keep things nicely paced and slow
    socketMessages.classList.add("closed"); // has 2s transition
    await delay(2000);
    socketMessages.innerHTML = "";
    saveMessages.classList.add("closed");
    await delay(2000);
    saveMessages.classList.add("dn");
    window.scrollTo({ // scroll up to make the customer reload tidy
        top: 0,
        left: 0,
        behavior: "smooth",
    });
    await delay(500);
    loadingSession = null;
    if (timer) {
      const timeTaken = findTimeTaken(timer);
      timer = null;
      this.dispatchEvent(toastEvent({
        notice: `Updates (${ev.detail.action}) completed after ${timeTaken} minutes` ,
        bgColour: "black",
        borderColour: "black"
      }));
    };
    // get Customer to reload everything
    this.dispatchEvent(new CustomEvent(`subscription.updates.completed`, {
      bubbles: true,
      detail: ev.detail,
    }));
    return;
  };

  // socket.closed when webhooks are received that verify that all updates have been completed
  window.addEventListener("socket.closed", reloadSubscription);

  for await ({ subscription, customer, admin, idx, completedAction } of this) { // eslint-disable-line no-unused-vars

    yield (
      <Fragment>
        <div 
          id={ `subscription-${subscription.subscription_id}-${idx}` }
          class="mb2 pb2 bb b--black-80">
          <h4 class="tl mb2 w-100 fg-streamside-maroon">
            {subscription.box.product_title} - {subscription.box.variant_title}
            { completedAction && (
              <span id={ `action-${subscription.subscription_id}` }
                class={ `b pv1 ph3 sans-serif white bg-${
                  completedActions[completedAction]
                } ba b--${
                  completedActions[completedAction]
                } br3 ml3 mb1 v-base` } style="font-size: smaller">{ completedAction }</span>
            )}
          </h4>
          <div class="flex-container w-100">
            <div class="w-50-ns w-100">
              <div class="dt">
                <div class="dtc gray b tr pr3 pv1">
                  Cancelled on:
                </div>
                <div class="dtc pv1">
                  <span>{ new Date(Date.parse(subscription.box.cancelled_at)).toDateString() }</span>
                </div>
              </div>
              <div class="dt">
                <div class="dtc gray b tr pr3 pv1">
                  Reason Given:
                </div>
                <div class="dtc pv1">
                  <span>{ subscription.box.cancellation_reason }</span>
                </div>
              </div>
              <div class="dt">
                <div class="dtc gray b tr pr3 pv1">
                  Subscription ID:
                </div>
                <div class="dtc pv1">
                  <span>{ subscription.subscription_id }</span>
                </div>
              </div>
              { (Boolean(subscription.lastOrder) && Object.hasOwnProperty.call(subscription.lastOrder, "order_number")) && (
                <div class="dt">
                  <div class="dtc gray b tr pr3 pv1">
                    Last Order:
                  </div>
                  <div class="dtc pv1">
                    <span>{ `${subscription.lastOrder.delivered} (#${subscription.lastOrder.order_number})` }</span>
                  </div>
                </div>
              )}
            </div>
            <div class="w-50-ns w-100">
              { pricedItems().map(item => (
                <div class="flex pv1">
                  <div class="w-70 bold" style={{
                      "text-overflow": "ellipsis",
                      "white-space": "nowrap",
                      "overflow": "hidden",
                    }}>
                    { item.title }
                  </div>
                  <div class="pricing w-10 tr">
                    <span>${ item.price }</span>
                  </div>
                  <div class="w-10 tc">({ item.count })</div>
                  <div class="pricing w-10 tr">
                    <span>{ item.total_price  }</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          { !editsPending && (
            <div id={`reactivate-${subscription.subscription_id}-${idx}`} class="w-100 pv2 tr">
              <DeleteSubscriptionModal subscription={ subscription } customer={ customer }
                admin={ admin }
                socketMessageId={ `${messageDivId}` } />
              <ReactivateSubscriptionModal subscription={ subscription } customer={ customer }
                admin={ admin }
                socketMessageId={ `${messageDivId}` } />
            </div>
          )}
          { (editsPending ) && (
            <Fragment>
              <div id={ `saveMessages-${subscription.subscription_id }` } class="tl w-100 saveMessages">
                <div class="alert-box dark-blue pa2 ma1 br3 ba b--dark-blue bg-washed-blue">
                  <p class="pa3 ma0">
                    <div>Your updates have been queued for saving.</div>
                    <div>
                      This can take several minutes. You may close the window and come back to it later. { " " }
                    </div>
                    <div>Check your emails for confirmation of the updates you have requested.</div>
                  </p>
                  <div id={ `displayMessages-${subscription.subscription_id }` } class="fg-streamside-blue">
                  </div>
                  <ProgressLoader />
                </div>
              </div>
            </Fragment>
          )}
        </div>
        <div id={ messageDivId } class="tl socketMessages"></div>
        { fetchError && <Error msg={fetchError} /> }
        { loading && <div id={ `loader-${idx}` }><BarLoader /></div> }
      </Fragment>
    )
  }
};

export default Cancelled;
