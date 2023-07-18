/**
 * Creates element to render cancelled subscriptions
 *
 * @module app/components/recharge/cancelled
 * @exports Cancelled
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment } from "@b9g/crank";
import { toPrice, animateFadeForAction, animateFade } from "../helpers";
import { PostFetch, Fetch } from "../lib/fetch";
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
} from "../helpers";

/**
 * Render a cancelled subscription
 *
 */
async function* Cancelled({ subscription, idx, admin }) {

  //console.log(JSON.stringify(subscription, null, 2));
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
   * After subscription reactivated data is returned that we store here so we can load the "charge"
   *
   * @member {array} ReactivatedResult
   */
  let reactivatedResult = {};
  /**
   * After subscription reactivated simply display it here
   *
   * @member {array} ReactivatedSubscription
   */
  let ReactivatedSubscription = false;
  /**
   * A save has been done so don't allow edits
   *
   * @member {object|string} editsPending
   */
  let editsPending = false;
  /**
   * The attempts attribute to force restart of Timer and count attempts
   *
   * @member {integer} attempts
   */
  let attempts = 0;
  /**
   * On cancel, delete, and reactivate we need to take some action This value
   * stores the string value of the action. Editing products and changing
   * schedule only requires the refreshing of this subscription only.
   *
   * @member {array} eventAction
   */
  let eventAction = "";
  /**
   * How long to delay reloading after submitting changes
   *
   * @member {array} timerSeconds
   */
  const timerSeconds = 30;

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
  const getActivatedSubscription = async () => {
    // this call needs to check updates_pending and return message, otherwise we get the subscription
    const { customer_id, address_id, subscription_id, scheduled_at } = reactivatedResult;
    const uri = `/api/recharge-customer-charges/${customer_id}/${address_id}/${scheduled_at}/${subscription_id}`;

    return await Fetch(encodeURI(uri))
      .then((result) => {
        const { error, json } = result;
        if (error !== null) {
          fetchError = error;
          return null;
        } else {
          return json;
        };
      })
      .catch((err) => {
        fetchError = err;
      });
  };

  /**
   * @function reloadCharge
   * Reload this particular charge from the server as a 'subsciption' object
   */
  const reloadSubscription = async (restartTimer, killTimer) => {

    loading = true;
    await this.refresh();

    // duplicated in the Subscription component - surely should figure out

    if (eventAction === "reactivated") {
      const json = await getActivatedSubscription();

      if (Object.hasOwnProperty.call(json, "message")) {
        // do something with it? Toast?
        attempts += 1; // force Timer reload and count attempts
        editsPending = true;
        loading = false;
        await this.refresh();
        if (restartTimer) restartTimer(timerSeconds);
        return;
      } else {
        // Toast?
        editsPending = false;
        attempts = 0;
        ReactivatedSubscription = json.subscription;
        const notice = `Reactivated ${ReactivatedSubscription.box.shopify_title} - ${ReactivatedSubscription.attributes.variant}`;
        this.dispatchEvent(toastEvent({
          notice,
          bgColour: "black",
          borderColour: "black"
        }));
        fetchError = null;
        if (killTimer) killTimer();
        loading = false;
        await this.refresh();
        const event = `subscription.reactivated`;
        const subdiv = document.querySelector(`#subscription-${ReactivatedSubscription.attributes.subscription_id}`);
        // customer div faded at Customer
        //const div = document.querySelector(`#customer`);
        //animateFade(div, 0.3);
        setTimeout(() => {
          animateFadeForAction(subdiv, () => {
            this.dispatchEvent(
              new CustomEvent(event, {
                bubbles: true,
                detail: {
                  subscription: ReactivatedSubscription,
                  //list: "cancelGroups",
                  subscription_id: ReactivatedSubscription.attributes.subscription_id
                },
              })
            );
          });
        }, 100);
        return;
      };
    };

  };

  const listingReload = async (ev) => {
    const result = ev.detail.json; // success, action, subscription_id

    reactivatedResult = result;
    // { action, customer_id, address_id, subscription_id, scheduled_at }

    ev.stopPropagation();
    // this means that the timer will start and reload
    eventAction = `${result.action}`;

    if (eventAction === "deleted") {
      // if this is a cancel or delete then we need to ask customer to reload all
      const event = `subscription.deleted`;
      const subdiv = document.querySelector(`#subscription-${subscription.box.id}`);
      // customer div faded at Customer
      //const div = document.querySelector(`#customer`);
      //animateFade(div, 0.3);
      setTimeout(() => {
        animateFadeForAction(subdiv, () => {
          this.dispatchEvent(
            new CustomEvent("subscription.deleted", {
              bubbles: true,
              detail: {
                subscription,
                subscription_id: subscription.box.id
              },
            })
          );
        });
      }, 100);
      return;
    };

    editsPending = true; // on deletes no need to start timer for reload
    await this.refresh();
    return;
  };

  this.addEventListener("listing.reload", listingReload);

  this.addEventListener("toastEvent", Toaster);

  for await ({ subscription } of this) { // eslint-disable-line no-unused-vars

    yield (
      ReactivatedSubscription ? (
        <Subscription subscription={ ReactivatedSubscription } idx={ idx } admin={ admin} />
      ) : (
        <Fragment>
          <div class="mb2 pb2 bb b--black-80">
            <h6 class="tl mb2 w-100 fg-streamside-maroon">
              {subscription.box.product_title} - {subscription.box.variant_title}
            </h6>
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
                <DeleteSubscriptionModal subscription={ subscription } />
                <ReactivateSubscriptionModal subscription={ subscription } />
              </div>
            )}
            { editsPending && (
              <Fragment>
                <div class="orange pa2 ma2 br3 ba b--orange bg-light-yellow">
                  <p class="b">
                    { ( attempts > 0) ? (
                      `Your subscription has updates pending. `
                    ) : (
                      `Your updates have been queued for saving. `
                    )}
                    This can take several minutes. Reloading subscription in 
                    <div class="di w-2">
                      <Timer seconds={ timerSeconds } 
                        crank-key={ `timer-${ idx }` }
                        callback={ reloadSubscription } /> ...
                    </div>
                    { attempts ? ` ${formatCount(attempts)} attempt completed, updates pending` : "" }
                  </p>
                </div>
                <ProgressLoader />
              </Fragment>
            )}
          </div>
          { fetchError && <Error msg={fetchError} /> }
          { loading && <div id={ `loader-${idx}` }><BarLoader /></div> }
        </Fragment>
      )
    );
  }
};

export default Cancelled;
