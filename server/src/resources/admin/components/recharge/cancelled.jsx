/**
 * Creates element to render cancelled subscriptions
 *
 * @module app/components/recharge/cancelled
 * @exports Cancelled
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment } from "@b9g/crank";
import { toPrice } from "../helpers";
import ReactivateSubscriptionModal from "./reactivate-modal";
import DeleteSubscriptionModal from "./delete-modal";

/**
 * Render a cancelled subscription
 *
 */
async function* Cancelled({ subscription }) {

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
          <div id={`reactivate-${subscription.subscription_id}`} class="w-100 pv2 tr">
            <DeleteSubscriptionModal subscription={ subscription } />
            <ReactivateSubscriptionModal subscription={ subscription } />
          </div>
        </div>
      </Fragment>
    );
  }
};

export default Cancelled;
