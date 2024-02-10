/**
 * Creates element to render cancelled subscriptions
 *
 * @module app/components/recharge/cancelled
 * @exports Cancelled
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment } from "@b9g/crank";
import { toPrice, animateFadeForAction, animateFade } from "../helpers";
import { Fetch } from "../lib/fetch";
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
  formatCount,
  findTimeTaken,
} from "../helpers";

/**
 * Render a cancelled subscription
 *
 */
async function* Cancelled({ subscription, customer, idx, admin }) {

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
   * @function getActivatedSubscription
   * Reload this particular charge from the server as a 'subsciption' object
   */
  const getActivatedSubscription = async (data) => {
    // this call needs to check updates_pending and return message, otherwise we get the subscription

    let uri = `/api/recharge-customer-charge/${data.charge_id}`;
    uri = `${uri}?customer_id=${data.customer_id}`;
    uri = `${uri}&address_id=${data.address_id}`;
    uri = `${uri}&subscription_id=${data.subscription_id}`;
    uri = `${uri}&scheduled_at=${data.scheduled_at}`;
    console.log(`Fetching ${uri}`);

    return await Fetch(encodeURI(uri))
      .then((result) => {
        const { error, json } = result;
        if (error !== null) {
          fetchError = error;
          return null;
        } else {
          return json.subscription;
        };
      })
      .catch((err) => {
        fetchError = err;
      });
  };

  /**
   * @function reloadCharge
   * Reload this particular charge from the server as a 'subsciption' object
   * @listens socket.closed
   */
  const reloadCharge = async (ev) => {

    ev.stopPropagation();

    const { detail } = ev;

    console.log(detail);
    if (!["cancelled", "deleted", "reactivated"].includes(detail.action)) return;

    const { charge_id, session_id, subscription_id, action } = detail;

    // get the message blocks to remove them
    const socketMessages = document.getElementById(messageDivId);
    const saveMessages = document.getElementById(`save-${messageDivId}`);

    if (socketMessages) {
      socketMessages.classList.add("closed"); // uses css transitions
    };

    if (saveMessages) {
      saveMessages.classList.add("closed"); // uses css transitions
    };

    if (timer) {
      const timeTaken = findTimeTaken(timer);
      timer = null;
      console.log(timeTaken);

      this.dispatchEvent(toastEvent({
        notice: `Updates completed after ${timeTaken} minutes` ,
        bgColour: "black",
        borderColour: "black"
      }));
    } else {
      console.warn("No timer object");
    };

    // use timeoout to wait for the collapse to complete
    setTimeout(async () => {
      if (socketMessages) {
        // clear the socket messaages
        socketMessages.innerHTML = "";
      } else {
        console.warn("No socketMessages object");
      };

      if (action === "reactivated") {
        // in this case we must reload as the new subscription from charge_id and subscriptionid from ev.detai??

        const reactivated = await getActivatedSubscription(detail);
        // then dispatch event to Customer which will shuffle the grouped subscriptions
        const subdiv = document.querySelector(`#subscription-${detail.subscription_id}`);
        if (subdiv) {
          setTimeout(() => {
            animateFadeForAction(subdiv, () => {
              this.dispatchEvent(
                new CustomEvent("subscription.reactivated", {
                  bubbles: true,
                  detail: {
                    subscription: reactivated,
                    //list: "chargeGroups",
                    subscription_id: detail.subscription_id,
                  },
                })
              );
            });
          }, 100);
          /*
        } else {
          console.log("darn no subdiv", `#subscription-${detail.subscription_id}`);
          setTimeout(() => {
              this.dispatchEvent(
                new CustomEvent("subscription.reactivated", {
                  bubbles: true,
                  detail: {
                    subscription: reactivated,
                    //list: "chargeGroups",
                    subscription_id: reactivated.id,
                  },
                })
              );
          }, 100);
          */
        };

      } else if (action === "deleted") {
        const subdiv = document.querySelector(`#subscription-${detail.subscription_id}`);
        setTimeout(() => {
          animateFadeForAction(subdiv, () => {
            this.dispatchEvent(
              new CustomEvent("subscription.deleted", {
                bubbles: true,
                detail: {
                  subscription,
                  subscription_id: detail.subscription_id
                },
              })
            );
          });
        }, 100);
      };

    });
    return;
  };

  // socket.closed when webhooks are received that verify that all updates have been completed
  window.addEventListener("socket.closed", reloadCharge);

  /**
   * @function reloadCharge
   * Reload this particular charge from the server as a 'subsciption' object
   * @listens listing.reload
   */
  const listingReload = async (ev) => {
    const result = ev.detail.json; // success, action, subscription_id

    console.log(result);

    // start the timer
    timer = new Date();

    ev.stopPropagation();

    if (`${result.action}` === "deleted") {
      // if this is a cancel or delete then we need to ask customer to reload all
      //return;
    };

    editsPending = true; // on deletes no need to start timer for reload
    await this.refresh();
    return;
  };

  this.addEventListener("listing.reload", listingReload);

  this.addEventListener("toastEvent", Toaster);

  for await ({ subscription } of this) { // eslint-disable-line no-unused-vars

    yield (
      <Fragment>
        <div class="mb2 pb2 bb b--black-80">
          <h3 class="tl mb2 w-100 fg-streamside-maroon">
            {subscription.box.product_title} - {subscription.box.variant_title}
          </h3>
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
                  <span>{ subscription.box.id }</span>
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
            <div id={`reactivate-${subscription.box.id}`} class="w-100 pv2 tr">
              <DeleteSubscriptionModal subscription={ subscription } customer={ customer }
                socketMessageId={ `${messageDivId}` } />
              <ReactivateSubscriptionModal subscription={ subscription } customer={ customer }
                admin={ admin }
                socketMessageId={ `${messageDivId}` } />
            </div>
          )}
          { (editsPending ) && (
            <Fragment>
              <div id={ `save-${messageDivId }` } class="tl saveMessages">
                <div class="alert-box dark-blue pa2 ma2 br3 ba b--dark-blue bg-washed-blue">
                  <p class="pa3 ma0">
                    <div>Your updates have been queued for saving.</div>
                    <div>
                      This can take several minutes. You may close the window and come back to it later. { " " }
                    </div>
                    <div>Check your emails for confirmation of the updates you have requested.</div>
                  </p>
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
