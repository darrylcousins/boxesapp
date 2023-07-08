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
import Toaster from "../lib/toaster";
import Timer from "../lib/timer";
import BarLoader from "../lib/bar-loader";
import ProgressLoader from "../lib/progress-loader";
import ReactivateSubscriptionModal from "./reactivate-modal";
import DeleteSubscriptionModal from "./delete-modal";
import Subscription from "./subscription";

/**
 * Render a cancelled subscription
 *
 */
async function* Cancelled({ subscription, idx }) {

  console.log(JSON.stringify(subscription, null, 2));
  /**
   * True while loading data from api
   * Starts false until search term submitted
   *
   * @member {boolean} loading
   */
  let loading = false;
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
  const timerSeconds = 5;

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
    console.log(reactivatedResult);
    const { customer_id, address_id, subscription_id, scheduled_at } = reactivatedResult;
    const uri = `/api/recharge-customer-charges/${customer_id}/${address_id}/${scheduled_at}/${subscription_id}`;
    console.log(uri);

    return await Fetch(encodeURI(uri))
      .then((result) => {
        console.log(result);
        const { error, json } = result;
        if (error !== null) {
          fetchError = error;
          return null;
        } else {
          console.log(json);
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

    console.log(eventAction);
    // duplicated in the Subscription component - surely should figure out
    if (eventAction === "reactivated") {
      console.log("got reactivated action so need to reload the reactivated subscription");
      const json = await getActivatedSubscription();
      console.log(json);

      if (Object.hasOwnProperty.call(json, "message")) {
        // do something with it? Toast?
        attempts += 1; // force Timer reload and count attempts
        editsPending = true;
        if (restartTimer) restartTimer(timerSeconds);
        return;
      } else {
        editsPending = false;
        attempts = 0;
        ReactivatedSubscription = json;
      };
    };

  };

  const listingReload = async (ev) => {
    const result = ev.detail.json; // success, action, subscription_id
    console.log("listing reload:", result);

    reactivatedResult = result;
    // { action, customer_id, address_id, subscription_id, scheduled_at }

    // this means that the timer will start and reload
    editsPending = true;
    if (result.action) eventAction = `${result.action}`;
    await this.refresh();

    return;
  };

  this.addEventListener("listing.reload", listingReload);

  this.addEventListener("toastEvent", Toaster);

  for await ({ subscription } of this) { // eslint-disable-line no-unused-vars

    yield (
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
                  <span>{ subscription.subscription_id }</span>
                </div>
              </div>
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
            <div id={`reactivate-${subscription.subscription_id}`} class="w-100 pv2 tr">
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
                    <Timer seconds={ timerSeconds } callback={ reloadSubscription } /> ...
                  </div>
                  { attempts ? ` ${formatCount(attempts)} attempt` : "" }
                </p>
              </div>
              <ProgressLoader />
            </Fragment>
          )}
        </div>
        { loading && <div id={ `loader-${idx}` }><BarLoader /></div> }
      </Fragment>
    );
  }
};

export default Cancelled;
