/**
 * Display the products for a box
 *
 * @module app/components/box
 * @exports Box
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement } from "@b9g/crank";
import CollapseWrapper from "../lib/collapse-animator";
import { PostFetch } from "../lib/fetch";
import { CloseIcon } from "../lib/icon";
import AddProductToBoxModal from "./product-add";
import { toastEvent } from "../lib/events";
import Toaster from "../lib/toaster";
import { titleCase, camelCaseToWords } from "../helpers";

/**
 * Products component - will be wrapped in collapsible component
 *
 * @param {array} products Array of products
 * @param {string} type included or addon
 * @generator Products
 */
function *Products ({box, products, type, allproducts}) {

  /**
   * Save removal of product from product list
   *
   * @function removeProduct
   */
  const removeProduct = async ({event, shopify_product_id, product_type, shopify_title}) => {
    const headers = { "Content-Type": "application/json" };
    const data = { shopify_product_id, product_type, box_id: box._id };
    const { error, json } = await PostFetch({
      src: "/api/remove-product-from-box",
      data: { shopify_product_id, product_type, box_id: box._id },
      headers,
    })
      .then((result) => result)
      .catch((e) => ({
        error: e,
        json: null,
      }));
    if (!error) {
      // call on the parent to refresh, which turns out to be a simple and elegant solution that 'just works'
      this.dispatchEvent(
        new CustomEvent("listing.reload", {
          bubbles: true,
        })
      );
      if (shopify_title && json.modifiedCount) { // only on direct remove
        const notice = `Removed ${shopify_title} from ${titleCase(camelCaseToWords(product_type))}`;
        this.dispatchEvent(toastEvent({
          notice,
          bgColour: "black",
          borderColour: "black"
        }));
      };
    }
    return { error, json };
  };

  const getNotType = (type) => {
    switch (type) {
      case "addOnProducts":
        return "includedProducts";
        break;
      case "includedProducts":
        return "addOnProducts";
        break;
      default:
        console.warn(`${type} is not correct`);
        return null;
        break;
    };
  };

  /**
   * Add product to product list
   *
   * @function addProduct
   */
  const addProduct = async ({shopify_product_id, product_type}) => {
    const headers = { "Content-Type": "application/json" };
    const data = { shopify_product_id, product_type, box_id: box._id };
    const { error, json } = await PostFetch({
      src: "/api/add-product-to-box",
      data: { shopify_product_id, product_type, box_id: box._id },
      headers,
    })
      .then((result) => result)
      .catch((e) => ({
        error: e,
        json: null,
      }));
    if (!error) {
      // do nothing - removeProduct will force data refresh
    }
    // need to provide user feedback of success or failure
    return { error, json };
  };

  /**
   * Drag and drop products between lists
   *
   * @function dragEnter
   */
  const dragEnter = (ev) => {
    ev.preventDefault();
    const productList = ev.target.closest("div[name='product-list']");
    ev.target.classList.add("bb", "b--gold");
  };

  /**
   * Drag and drop products between lists
   *
   * @function dragLeave
   */
  const dragLeave = (ev) => {
    ev.preventDefault();
    const productList = ev.target.closest("div[name='product-list']");
    ev.target.classList.remove("bb", "b--gold");
  };

  /**
   * Drag and drop products between lists
   *
   * @function allowDrop
   */
  const dragOver = (ev) => {
    ev.preventDefault();
  };

  /**
   * Drag and drop products between lists
   *
   * @function dragEnd
   */
  const dragEnd = (ev) => {
    const shopify_product_id = ev.target.getAttribute("data-id");
    document.getElementById(`${shopify_product_id}`).classList.remove("o-30");
    [...document.getElementsByClassName("b--gold")].forEach(el => el.classList.remove("bb", "b--gold"));
  };

  /**
   * Drag and drop products between lists
   *
   * @function dragStart
   */
  const dragStart = (ev) => {
    const shopify_product_id = ev.target.getAttribute("data-id");
    const product_type = ev.target.getAttribute("data-type");
    const shopify_title = ev.target.getAttribute("data-title");
    document.getElementById(`${shopify_product_id}`).classList.add("o-30");
    ev.dataTransfer.setData("text", `${product_type}:${shopify_product_id}:${shopify_title}`);
  };

  /**
   * Drag and drop products between lists
   *
   * @function drop
   */
  const drop = async (ev) => {
    ev.preventDefault();
    const [product_type, product_id, shopify_title] = ev.dataTransfer.getData("text").split(":");

    const nearest = ev.target.querySelector("div[draggable=true]");
    const target = nearest ? nearest : ev.target;
    const target_type = target.getAttribute("data-type");

    if (product_type !== target_type) {
      const shopify_product_id = parseInt(product_id);
      // return error/json
      const { error: addError, json: addJson } = await addProduct({shopify_product_id, product_type: target_type});
      if (addJson.modifiedCount) {
        const notice = `Added ${shopify_title} to ${titleCase(camelCaseToWords(target_type))}`;
        this.dispatchEvent(toastEvent({
          notice,
          bgColour: "black",
          borderColour: "black"
        }));
      };
      const { error: removeError, json: removeJson } = await removeProduct({shopify_product_id, product_type});
      if (removeJson.modifiedCount) {
        const notice = `Removed ${shopify_title} from ${titleCase(camelCaseToWords(product_type))}`;
        this.dispatchEvent(toastEvent({
          notice,
          bgColour: "black",
          borderColour: "black"
        }));
      };
    };

  };

  for ({ box, products, allproducts } of this) {
    yield (
      <div
        id={`${type}-${box._id}`}
        class="mt1"
      >
        <AddProductToBoxModal
          type={type}
          box={box}
          boxproducts={allproducts.map((el) => el.shopify_product_id)} />
        <div
          name="product-list"
          data-type={type}
          ondrop={drop}
          ondragover={dragOver}
          ondragenter={dragEnter}
          ondragleave={dragLeave}
          style={{height: products.length ? "auto" : "100px"}}
        >
        {products.map((el) => (
            <div
              class="w-100 dt hover-dark-blue"
              name="product-item"
              id={el.shopify_product_id}
              data-type={type}
            >
              <div class="dtc tl hover-dark-red pointer w-10"
                onclick={(e) => removeProduct({
                  event: e,
                  shopify_product_id: el.shopify_product_id,
                  product_type: type,
                  shopify_title: el.shopify_title,
                })}
                title={`Remove ${el.shopify_title}`}>
                <span class="v-mid">
                  <CloseIcon />
                </span>
              </div>
              <div
                class="dtc w-90"
              >
                <div
                  class="dib w-100"
                  style={{cursor: "crosshair"}}
                  draggable="true"
                  ondragstart={dragStart}
                  ondragend={dragEnd}
                  data-id={el.shopify_product_id}
                  data-title={el.shopify_title}
                  data-type={type}
                >{el.shopify_title}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };
};

/*
 * Wrap products in collapsible wrapper
 */
const CollapsibleProducts = CollapseWrapper(Products);
export default CollapsibleProducts;
