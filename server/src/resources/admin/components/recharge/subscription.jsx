/**
 * Makes subscription component
 *
 * @module app/recharge/subscription
 * @exports Subscription
 * @requires module:app/recharge/subscription
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment } from "@b9g/crank";
import CollapseWrapper from "../lib/collapse-animator";
import EditProducts from "../products/edit-products";
import Error from "../lib/error";
import { PostFetch } from "../lib/fetch";
import { toastEvent } from "../lib/events";
import Toaster from "../lib/toaster";
import BarLoader from "../lib/bar-loader";
import Button from "../lib/button";
import SkipChargeModal from "./skip-modal";
import CancelSubscriptionModal from "./cancel-modal";
import {
  animateFadeForAction,
  LABELKEYS
} from "../helpers";

/**
 * Subscription
 *
 * @function
 * @param {object} props Props
 * @param {object} props.subscription Subscription object
 * @yields Element
 * @example
 * import {renderer} from '@b9g/crank/dom';
 * renderer.render(<Subscription subscription={subscription} />, document.querySelector('#app'))
 */
async function *Subscription({ subscription, idx, allowEdits }) {

  const CollapsibleProducts = CollapseWrapper(EditProducts);
  /**
   * Hold changed items
   *
   * @member {boolean} changed
   */
  let changed = [];
  /**
   * Hold collapsed state of product edit business
   *
   * @member {boolean} collapsed
   */
  let collapsed = true;
  /**
   * Success after saving changes
   *
   * @member {boolean} success
   */
  let success = false;
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

  /*
   * Control the collapse of product list
   * @function toggleCollapse
   */
  const toggleCollapse = () => {
    collapsed = !collapsed;
    const title = document.querySelector(`#title-${idx}`);
    const next = () => {
      const address = document.querySelector(`#address-${idx}`);
      if (address) {
        animateFadeForAction(address, () => this.refresh());
      } else {
        this.refresh();
      };
    };
    if (title) {
      animateFadeForAction(title, () => this.refresh());
    } else {
      this.refresh();
    };
    if (changed.length > 0) {
      setTimeout(() => {
          const bar = document.querySelector(`#saveBar-${subscription.attributes.subscription_id}`);
          bat.classList.add("open");
          const el = document.querySelector(`#skip_cancel-${subscription.attributes.subscription_id}`);
          el.classList.add("dn");
        }, 
        1000);
    };
  };

  console.log(subscription);
  /*
   * When the reconciled box shows changes with messages then the user must
   * save these changes before continuing
   * Also used by saveEdits to save changes made by the user.
   * @function saveChanges
   */
  const saveChanges = (key) => {
    loading = true;
    this.refresh();
    let updates;
    if (key === "includes") {
      updates = subscription.includes.filter(el => changed.includes(el.shopify_product_id));
      for (const item of subscription.removed) {
        item.quantity = 0;
        updates.push(item);
      };
      // find the loaded image for the added items (loaded from shopify)
      for (const item of subscription.includes) {
        if (Object.hasOwnProperty.call(item, "external_product_id")) {
          const div = document.getElementById(`image-${item.product_title.replace(/ /g, "-")}`);
          if (div) {
            const img = div.firstChild;
            const style = img.currentStyle || window.getComputedStyle(img, false);
            const url = style.backgroundImage.slice(4, -1).replace(/['"]/g, "");
            item.images = { small: url }
          };
        };
      };
    } else {
      updates = subscription.updates;
      // XXX TODO and fix the includes?
    };
    setTimeout(() => {
      const el = document.querySelector(`#overlay-${idx}`);
      const products = document.querySelector(`#loader-${idx}`);
      const rect = products.getBoundingClientRect();
      el.style.top = `${parseInt(rect.top) + window.scrollY + 5}px`;
      el.classList.remove("dn");
      el.classList.add("db");
    }, 500);
    let headers = { "Content-Type": "application/json" };
    const src = "/api/recharge-update";
    const data = { updates };
    PostFetch({ src, data, headers })
      .then((result) => {
        const { error, json } = result;
        if (error !== null) {
          fetchError = error;
          loading = false;
          this.refresh();
        } else {
          subscription.messages = [];
          subscription.updates = [];
          subscription.removed = [];
          changed = [];
          // this will replace the new subscription template with an update object
          for (const included of json.includes) {
            const includedIdx = subscription.includes.findIndex(el => el.shopify_product_id === included.shopify_product_id);
            subscription.includes[includedIdx] = included;
          };
          // remove the zerod items
          subscription.includes = subscription.includes.filter(el => el.quantity > 0);
          loading = false;
          this.refresh();
          let notice;
          if (key === "updates") {
            notice = "Subscription updated to match upcoming box";
            this.refresh();
          } else {
            notice = "Subscription updates saved";
          };
          this.dispatchEvent(toastEvent({
            notice,
            bgColour: "black",
            borderColour: "black"
          }));
        }
      })
      .catch((err) => {
        fetchError = err;
        loading = false;
        this.refresh();
      });
  };

  this.addEventListener("toastEvent", Toaster);

  // helper method
  const makeItemString = (list) => {
    return list.map(el => {
      return `${el.shopify_title}${el.quantity > 1 ? ` (${el.quantity})` : ""}`;
    }).sort().join(",");
  };

  /**
   * @function productsChanged
   * @listens productChangeEvent From EditProducts component
   */
  const productsChanged = async (ev) => {
    const { type, product, properties: props, total_price } = ev.detail;

    changed.push(product.shopify_product_id);

    // update the properties
    for (const name of LABELKEYS) {
      if (name === "Delivery Date") continue;
      const list = props[name];
      subscription.properties[name] = makeItemString(props[name]);
    };
    const likes = [ ...props["Swapped Items"], ...props["Add on Items"] ];
    subscription.properties["Likes"] = likes.map(el => el.shopify_title).join(",");
    subscription.properties["Dislikes"] = props["Removed Items"].map(el => el.shopify_title).join(",");

    const included = subscription.includes.find(el => el.shopify_product_id === product.shopify_product_id);

    const propertyTemplate = [
      { name: "Delivery Date", value: subscription.box.delivered },
      { name: "Add on product to", value: subscription.box.shopify_title },
      { name: "box_subscription_id", value: `${subscription.attributes.subscription_id}` },
    ];

    let addingProduct = false;
    let quantity;

    if (Object.hasOwnProperty.call(type, "from")) {
      if (type.from === "Add on Items" && type.to === "Available Products") {
        if (included) {
          // item to be removed from subscription
          const includedIdx = subscription.includes.findIndex(el => el.shopify_product_id === product.shopify_product_id);
          // save it as well in case they put it back in
          included.quantity = 1;
          subscription.removed.push(included)
          subscription.includes.splice(includedIdx, 1);
        };
      };
      if (type.from === "Available Products" && type.to === "Add on Items") {
        const removedIdx = subscription.removed.findIndex(el => el.shopify_product_id === product.shopify_product_id);
        if (removedIdx !== -1) {
          subscription.includes.push(subscription.removed[removedIdx]);
          subscription.removed.splice(removedIdx, 1);
        } else {
          quantity = 1;
          addingProduct = true;
        };
      };
    };

    if (Object.hasOwnProperty.call(type, "count")) {
      // fix depending on the list
      quantity = (type.count === "Add on Items") ? product.quantity : product.quantity - 1;
      if (included) {
        included.quantity = quantity;
      } else {
        quantity = 1;
        addingProduct = true;
      };
    };
    if (addingProduct) {
      subscription.includes.push({
        product_title: product.shopify_title,
        ...subscription.attributes.templateSubscription,
        price: `${(product.shopify_price * 0.01).toFixed(2)}`,
        quantity,
        external_product_id: {
          ecommerce: `${product.shopify_product_id}`
        },
        external_variant_id: {
          ecommerce: `${product.shopify_variant_id}`
        },
        properties: [ ...propertyTemplate ],
        shopify_product_id: product.shopify_product_id, // so we can still find it in the list
      });
    };

    const bar = document.querySelector(`#saveBar-${subscription.attributes.subscription_id}`);
    bar.classList.add("open");
    const el = document.querySelector(`#skip_cancel-${subscription.attributes.subscription_id}`);
    el.classList.add("dn");

  };

  /**
   * For updating product lists
   *
   * @listens productsChangeEvent From EditProducts
   */
  this.addEventListener("productsChangeEvent", productsChanged);

  /**
   * @function saveEdits
   * Save the changes made
   */
  const saveEdits = () => {
    const box_id = subscription.box.shopify_product_id;
    // update the values for the subscription box
    const boxInclude = subscription.includes.find(el => el.shopify_product_id === box_id);
    changed.push(box_id);
    boxInclude.properties = Object.entries(subscription.properties).map(([name, value]) => {
      return { name, value };
    });
    boxInclude.properties.push({
      name: "box_subscription_id", value: `${subscription.attributes.subscription_id}`
    });
    saveChanges("includes");
  };

  /**
   * @function cancelEdits
   * Cancel changes made
   */
  const cancelEdits = () => {
    this.dispatchEvent(
      new CustomEvent("subscription.reload", {
        bubbles: true,
        detail: { id: subscription.attributes.subscription_id },
      })
    );
  };

  /*
   * Tidy display of subscriptions after skip and cancel
   */
  const reLoad = (ev) => {
    const subdiv = document.querySelector(`#subscription-${subscription.attributes.subscription_id}`);
    // and updates chargeGroups
    let event;
    if (ev.detail.src.includes("skip")) {
      event = "subscription.skipped";
    } else if (ev.detail.src.includes("cancel")) {
      event = "subscription.cancelled";
    };
    if (event) {
      setTimeout(() => {
        animateFadeForAction(subdiv, () => {
          this.dispatchEvent(
            new CustomEvent(event, {
              bubbles: true,
              detail: { id: subscription.attributes.subscription_id },
            })
          );
        });
      }, 100);
    };
  };

  this.addEventListener("listing.reload", reLoad);

  /*
   * @function AttributeRow
   * Layout helper
   */
  const AttributeRow = ({ title, value }) => {
    return (
      <Fragment>
        <div class={`fl w-50 gray tr pr3 pv1${title.startsWith("Next") && " b"}`}>
          { title }:
        </div>
        <div class={`fl w-50 pv1${title.startsWith("Next") && " b"}`}>
          <span>{ value }</span>
        </div>
      </Fragment>
    );
  };

  /*
   * @function AttributeColumn
   * Layout helper
   */
  const AttributeColumn = ({ data }) => {
    return (
      data.map(([title, value]) => (
        value && (
          <AttributeRow title={ title } value={ value } />
        )
      ))
    );
  };

  /*
   * @member idData
   * Layout helper
   */
  const idData = [
      ["Subscription ID", subscription.attributes.subscription_id],
      ["Charge Id", subscription.attributes.charge_id],
      ["Address Id", subscription.attributes.address_id],
      ["Recharge Customer Id", subscription.attributes.customer.id],
      ["Shopify Customer Id", subscription.attributes.customer.external_customer_id.ecommerce],
  ];

  /*
   * @function AddressColumn
   * Layout helper
   */
  const AddressColumn = ({ data }) => {
    return (
      data.map((value) => (
        value && (
          <span class="db">{value}</span>
        )
      ))
    );
  };

  /*
   * @member addressData
   * Layout helper
   */
  const addressData = [
    `${subscription.address.first_name} ${subscription.address.last_name}`,
    subscription.address.email,
    subscription.address.address1,
    subscription.address.address2 ? subscription.address.address2 : "",
    subscription.address.city,
    subscription.address.zip,
    subscription.address.phone,
    subscription.address.email,
  ];

  for await ({ subscription, idx, allowEdits } of this) { // eslint-disable-line no-unused-vars

    /*
     * @member chargeData
     * Layout helper
     */
    const chargeData = [
        ["Next Charge Date", subscription.attributes.nextChargeDate],
        ["Next Scheduled Delivery", subscription.attributes.nextDeliveryDate],
        ["Frequency", subscription.attributes.frequency],
        ["Last Order", `#${subscription.attributes.lastOrder.order_number}`],
        ["Order Delivered", subscription.attributes.lastOrder.delivered],
    ];

    yield (
      <Fragment>
        <h6 class="tl mb0 w-100 fg-streamside-maroon">
          {subscription.box.shopify_title} - {subscription.attributes.variant}
        </h6>
        { !subscription.attributes.hasNextBox && (
          <div class="pv2 orange">Box not yet loaded for <span class="b">
              { subscription.attributes.nextDeliveryDate }
          </span></div>
        )}
        <div class="flex-container-reverse w-100 pt2 relative" id={ `title-${idx}` }>
          <div class="dt">
            <AttributeColumn data={ idData } />
          </div>
          <div class="dt">
            <div class="">
              <AttributeColumn data={ chargeData } />
            </div>
          </div>
          <div class="dt tr nowrap">
            <AddressColumn data={ addressData } />
          </div>
        </div>
        { subscription.messages.length === 0 && (
          <div id={`skip_cancel-${subscription.attributes.subscription_id}`} class="w-100 pb2 tr">
            <Button type="success"
              onclick={toggleCollapse}
              title={ collapsed ? (subscription.attributes.hasNextBox ? "Edit products" : "Show products") : "Hide products" }
            >
              <span class="b">
                { collapsed ? (subscription.attributes.hasNextBox ? "Edit products" : "Show products") : "Hide products" }
              </span>
            </Button>
            { allowEdits && collapsed && (
              <Fragment>
                <SkipChargeModal subscription={ subscription } />
                <CancelSubscriptionModal subscription={ subscription } />
              </Fragment>
            )}
          </div>
        )}
        { !subscription.attributes.hasNextBox && !collapsed && (
          <div class="dark-blue pa2 ma2 br3 ba b--dark-blue bg-washed-blue">
            <p class="">You will be able to edit your box products when the next box has been loaded.</p>
          </div>
        )}
        { subscription.messages.length > 0 && (
            <div class="dark-blue pa2 ma2 br3 ba b--dark-blue bg-washed-blue">
                <Fragment>
                  <ul class="">
                    { subscription.messages.map(el => <li>{el}</li>) }
                  </ul>
                  { subscription.attributes.nowAvailableAsAddOns.length > 0 && (
                    <p class="pl5">New available this week: { subscription.attributes.nowAvailableAsAddOns.join(", ") }</p>
                  )}
                  <div class="tr mv2 mr3">
                    <Button type="primary" onclick={() => saveChanges("updates")}>
                      <span class="b">
                        Continue
                      </span>
                    </Button>
                  </div>
                </Fragment>
            </div>
        )}
        { loading && <div id={ `loader-${idx}` }><BarLoader /></div> }
        { fetchError && <Error msg={fetchError} /> }
        <div id={`saveBar-${subscription.attributes.subscription_id}`} class="save_bar white mv1 br2">
          <div class="flex-container w-100 pa2">
            <div class="w-100 pl4" style="line-height: 2em">
              <span class="bold v-mid">
                Unsaved changes
              </span>
            </div>
            <div class="w-100 tr">
              <div class="dib pr2 nowrap">
                <Button
                  onclick={ cancelEdits }
                  type="transparent/dark">
                  Cancel
                </Button>
              </div>
              <div class="dib pr2" id="saveEdits">
                <Button
                  onclick={ saveEdits }
                  hover="dim"
                  border="navy"
                  type="primary">
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>
        <div class="mb2 bb b--black-80">
          { allowEdits && (
            <div id={ `products-${idx}` }>
              <CollapsibleProducts
                collapsed={ collapsed }
                properties={ subscription.properties }
                box={ subscription.box }
                images={ subscription.attributes.images }
                nextChargeDate={ subscription.attributes.nextChargeDate }
                isEditable={ subscription.attributes.hasNextBox }
                key={ idx }
                id={ `subscription-${idx}` }
              />
            </div>
          )}
        </div>
      </Fragment>
    )
  };
};

export default Subscription;
