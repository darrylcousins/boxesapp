/**
 * Provide some helper methods
 *
 * @module app/recharge/lib
 */

import { createElement, Fragment } from "@b9g/crank";
import { ShopifyProductImage } from "./lib";
import { toPrice } from "../helpers";
import {
  showActionModalEvent,
  requiredActionCallbackEvent,
} from "./events";
import {
  OrphanedItems,
  SubscribedNotAvailable,
} from "./actions";

/*
 * The opening action, give some details and click "continue"
 *
 * @function chainStartAction
 *
 */
const chainStartAction = ({ parent, fetchBox }) => {
  const modalNote = (
    <div class="tc center">
      <h6 class="fw4 tl fg-streamside-maroon">
        Action is required to reconcile subscribed products for { fetchBox.delivered } before you can continue to update your box.
      </h6>
    </div>
  );
  const options = {
    modalCallback: {callback: requiredActionCallbackEvent, caller: parent },
    modalNote,
    modalType: "confirm", // no selection required
    modalButtonText: "Continue", // the button text
  };
  parent.dispatchEvent(showActionModalEvent(options));
};

/*
 * Deal with the extras found that do not have a matching subscription
 *
 * @function unsubscribedExtrasAction
 *
 */
const unsubscribedExtrasAction = async ({ parent, subscription, items, availableProducts, boxLists, includedSubscriptions, fetchBox }) => {
  console.log("unsubscribedExtrasAction");
  console.log(JSON.stringify(items, null, 2));
  const pluralize = (items.length > 1 || items.find(el => el.count > 1));

  const modalNote = (
    <Fragment>
    <div class="tc center">
      <h6 class="fw4 tl fg-streamside-maroon">
        Extra product{ pluralize && "s"} included in the box for { fetchBox.delivered } but not subscribed to.
      </h6>
    </div>
      { items.map((el) => (
        <div id={`wrapper-${el.shopify_product_id}`} class="ma1">
          <ShopifyProductImage shopify_product_id={ el.shopify_product_id } />
          <div class="dib v-mid fw6 ml3">{ el.str }{ el.count > 1 && ` (${el.count})` } { toPrice(el.shopify_price) }</div>
          <p class="lh-copy">
            Choose an action from the following:
            <div class="flex justify-between pv1">
              <label class="pointer items-center ph1">
                <input 
                  checked={ false }
                  class="mr2"
                  type="radio"
                  id="create-subscription"
                  value="create-subscription"
                  name="action" />
                  Add as a subscription
              </label>
            </div>
            <div class="flex justify-between pv1">
              <label class="pointer items-center ph1">
                <input 
                  checked={ false }
                  class="mr2"
                  type="radio"
                  id="remove-from-box"
                  value="remove-from-box"
                  name="action" />
                  Remove the extra item{ el.count > 1 && "s" } from the box
              </label>
            </div>
          </p>
        </div>
      ))}
    </Fragment>
  );
  
  // present modal for confirmation of suspension of subscribed item
  const options = {
    modalCallback: {callback: requiredActionCallbackEvent, caller: parent },
    modalNote,
    modalType: "confirm", // selection required
    modalButtonText: "OK", // the button text
  };
  parent.dispatchEvent(showActionModalEvent(options));
};

/*
 * Deal with the subscribed items that are not available
 * Simple solution - pause the subscription
 *
 * @function subscribedNotAvailableAction
 *
 */
const subscribedNotAvailableAction = async ({ parent, subscription, items, availableProducts, boxLists, includedSubscriptions, fetchBox }) => {
  console.log("subscribedNotAvailableAction");
  console.log(JSON.stringify(items, null, 2));

  const updatedItems = items.map(item => {
    const sub = includedSubscriptions.find(el => el.external_product_id.ecommerce === item.shopify_product_id);
    return { ...item, subscription_id: sub.purchase_item_id };
  });
  const charge = new Date(Date.parse(subscription.next_charge_scheduled_at));
  charge.setDate(charge.getDate() + 7);
  console.log(charge.toDateString());

  const deliveryDate = subscription.properties.find(el => el.name === "Delivery Date").value;
  const delivered = new Date(Date.parse(deliveryDate));
  delivered.setDate(delivered.getDate() + 7);
  console.log(delivered.toDateString());

  console.log(JSON.stringify(updatedItems, null, 2));
  const completed = {callback: requiredActionCallbackEvent, caller: parent };
  const modalChildren = (
    <SubscribedNotAvailable
      items={ updatedItems }
      box={ fetchBox }
      lists={ boxLists }
      completed={ completed } />
  );
  
  const options = {
    modalChildren,
  };
  parent.dispatchEvent(showActionModalEvent(options));
};

/*
 * Deal with the subscribed items not added as extras
 * Need to think about where the item can go - Includes+1? or Addons? or Swapped+1
 * Ask?
 *
 * @function subscribedNotIncludedAction
 *
 */
const subscribedNotIncludedAction = async ({ parent, subscription, items, availableProducts, boxLists, includedSubscriptions, fetchBox }) => {
  console.log("subscribedNotIncludedAction");
  console.log(JSON.stringify(items, null, 2));

  // we know that it is in availableProducts
  // find if it is in boxLists["Included"] => can then increment boxLists["Included"]
  // find if it is in boxLists["Swapped Items"] => can then increment boxLists["Swapped Items"]
  // otherwise add to boxLists["Add on Items"]

  const updatedItems = items.map(item => {
    let listName;
    for (const name of ["Including", "Swapped Items"]) {
      if (boxLists[name].find(el => el.shopify_title === item.str)) {
        listName = name;
        break;
      };
    };
    listName = listName ? listName : "Add on Items";
    return { ...item, listName };
  });

  const pluralize = (items.length > 1 || items.find(el => el.count > 1));

  const modalNote = (
    <Fragment>
      <div class="tc center">
        <h6 class="fw4 tl fg-streamside-maroon">
          Subscribed product{ pluralize && "s"} that { pluralize ? "are" : "is" } 
          not included as extras in the box for { fetchBox.delivered }
        </h6>
      </div>
      { updatedItems.map((el) => (
        <Fragment>
          <div id={`wrapper-${el.shopify_product_id}`} class="ma1">
            <ShopifyProductImage shopify_product_id={ el.shopify_product_id } />
            <div class="dib v-mid fw6 ml3">{ el.str }{ el.count > 1 && ` (${el.count})` }</div>
          </div>
          <p class="lh-copy">
            Choose an action from the following:
            <div class="flex justify-between pv1">
              <label class="pointer items-center ph1">
                <input 
                  checked={ false }
                  class="mr2"
                  type="radio"
                  id="skip-subscription"
                  value="skip-subscription"
                  name="action" />
                  Skip the subscription for this delivery
              </label>
            </div>
            <div class="flex justify-between pv1">
              <label class="pointer items-center ph1">
                <input 
                  checked={ false }
                  class="mr2"
                  type="radio"
                  id="remove-from-box"
                  value="remove-from-box"
                  name="action" />
                  The item{ el.count > 1 && "s" } from the box will be added to {el.listName}
              </label>
            </div>
          </p>
        </Fragment>
      ))}
    </Fragment>
  );
  
  // present modal for confirmation of suspension of subscribed item
  const options = {
    modalCallback: {callback: requiredActionCallbackEvent, caller: parent },
    modalNote,
    modalType: "confirm", // selection required
    modalButtonText: "OK", // the button text
  };
  parent.dispatchEvent(showActionModalEvent(options));
};

/*
 * Deal with the items in boxLists that are not in the current box
 * Need to ask for another swap if this is swapped item
 * XXX Most important are swapped items, because can't remove a Removed Item if not swap to take away
 *
 * @function orphanedItemsAction
 *
 */
const orphanedItemsAction = async ({ parent, subscription, items, availableProducts, boxLists, includedSubscriptions, fetchBox }) => {
  console.log("orphanedItemsAction");
  console.log(JSON.stringify(items, null, 2));

  const pluralize = (items.length > 1 || items.find(el => el.count > 1));

  const completed = {callback: requiredActionCallbackEvent, caller: parent };
  const modalChildren = (
    <OrphanedItems
      items={ items }
      box={ fetchBox }
      lists={ boxLists }
      completed={ completed } />
  );
  
  const options = {
    modalChildren,
  };
  parent.dispatchEvent(showActionModalEvent(options));
};

export {
  unsubscribedExtrasAction,
  subscribedNotAvailableAction,
  subscribedNotIncludedAction,
  orphanedItemsAction,
  chainStartAction,
};
