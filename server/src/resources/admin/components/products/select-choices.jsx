/**
 * Figure out the modal options for moving a product
 *
 * @module app/recharge/select-choices
 */

import { createElement, Fragment } from "@b9g/crank";

export const getSelectModalOptions = ({boxLists, from_list_name, shopify_product_id}) => {
    const product = boxLists[from_list_name].find(el => el.shopify_product_id === shopify_product_id);
    let [
      modalStore,
      modalSelect,
      modalSelectList,
      modalNote,
      modalType,
    ] = Array(5).fill(null);
    modalType = from_list_name;
    switch(from_list_name) {
      case "Including":
        modalStore = {id: shopify_product_id, from: from_list_name, to: "Removed Items"};
        modalSelect = {from: "possibleAddons", to: "Swapped Items"};
        modalSelectList = boxLists["possibleAddons"].filter(el => {
            if (el.shopify_tag === product.shopify_tag) {
              return ((product.shopify_price - 50 <= el.shopify_price) && (el.shopify_price <= product.shopify_price + 50));
            } else {
              return false;
            };
          });
        modalNote = (
          <Fragment>
            <h6 class="fw4 tl fg-streamside-maroon">
              Removing &lsquo;{product.shopify_title}&rsquo;.
            </h6>
            { product.quantity > 1 && (
              <p class="bold">{ product.quantity } items will be removed, change the quantity if this is not your intention.</p>
            )}
            <p class="bold">To continue please select a replacement as a
              swapped item from this list of available and similarly priced
          items.</p>
          </Fragment>
        );
        break;
      case "Add on Items":
        modalStore = {id: shopify_product_id, from: from_list_name, to: "possibleAddons"};
        modalNote = (
          <Fragment>
            <h6 class="fw4 tl fg-streamside-maroon">
              Removing &lsquo;{product.shopify_title}&rsquo; from add ons.
            </h6>
            { product.quantity > 1 && (
              <Fragment>
                <p class="bold">{ product.quantity } items will be removed, change the quantity if you want to remove one only.</p>
              </Fragment>
            )}
          </Fragment>
        );
        break;
      case "Removed Items":
        modalStore = {id: shopify_product_id, from: from_list_name, to: "Including"};
        modalSelect = {from: "Swapped Items", to: "possibleAddons"};
        modalSelectList = boxLists["Swapped Items"]; 
        modalNote = (
          <Fragment>
            <h6 class="fw4 tl fg-streamside-maroon">
              Putting &lsquo;{product.shopify_title}&rsquo; back into the box.
            </h6>
            { modalSelectList.length > 1 ? (
              <p class="bold">To continue please select one of the swapped items to remove.</p>
            ) : (
              <Fragment>
                <p class="bold">The following swapped item will be removed.</p>
                { modalSelectList[0].quantity > 1 && (
                  <p class="bold">Only one of the { modalSelectList[0].quantity } items will be removed, the remaining will be moved to your add on items.</p>
                )}
              </Fragment>
            )}
          </Fragment>
        );
        break;
      case "Swapped Items":
        modalStore = {id: shopify_product_id, from: from_list_name, to: "possibleAddons"};
        modalSelect = {from: "Removed Items", to: "Including"};
        modalSelectList = boxLists["Removed Items"]; 
        modalNote = (
          <Fragment>
            <h6 class="fw4 tl fg-streamside-maroon">
              &lsquo;{product.shopify_title}&rsquo; is a swapped item.
            </h6>
            { product.quantity > 1 && (
              <p class="bold">Only one of the { product.quantity } items will be removed, the remaining will be moved to your add on items.</p>
            )}
            { modalSelectList.length > 1 ? (
              <p class="bold">To continue please select one of the removed items to return to the box.</p>
            ) : (
              <p class="bold">The following removed item will be returned to the box.</p>
            )}
          </Fragment>
        );
        break;
    };
    return {
      modalStore,
      modalSelect,
      modalSelectList,
      modalNote,
      modalType,
    };
  };
