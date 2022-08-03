/**
 * Creates element to render modal form to add a product to a box.
 *
 * @module app/components/product-add
 * @requires module:app/form/form-modal-wrapper~FormModalWrapper
 * @requires module:app/lib/icon-button~IconButton
 * @exports AddProductToBoxModal
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment } from "@b9g/crank";

import Button from "../lib/button";
import { PostFetch } from "../lib/fetch";
import BarLoader from "../lib/bar-loader";
import Error from "../lib/error";
import FormModalWrapper from "../form/form-modal";
import Form from "../form";
import InputSelect from "../form/fields/input-select";
import { camelCaseToWords, titleCase } from "../helpers";

/**
 * Icon button for link to expand modal
 *
 * @function ShowLink
 * @param {object} opts Options that are passed to {@link module:app/lib/icon-button~IconButton|IconButton}
 * @param {string} opts.name Name as identifier for the action // optional
 * @param {string} opts.title Hover hint // optional
 * @param {string} opts.color String colour // optional
 * @param {string} opts.showModal Action function // optional
 * @returns {Element} An icon button
 */
const ShowLink = (opts) => {
  const { title, showModal } = opts;
  return (
    <div
      class="dt w-100 ba br1 pa1 mv1 blue bg-washed-blue pointer"
      onclick={showModal}
      title={title}>
      <span class="dtc pl1">{title}</span>
      <span class="dtc fa fa-plus tr" />
    </div>
  );
};

/**
 * Options object passed to module:app/components/form-modal~FormModalWrapper
 *
 * @member {object} options
 */
const options = {
  id: "add-product",
  title: "Adding product to",
  linkTitle: "Add Product",
  color: "blue",
  src: "/api/add-product-to-box",
  ShowLink,
  saveMsg: "Adding selected product ...",
  successMsg: "Successfully added product, reloading page.",
};

/**
 * Get the products using search term
 *
 * @returns {object} Error (if any) and the products
 */
const getProducts = async ({search}) => {
  const headers = { "Content-Type": "application/json" };
  const { error, json } = await PostFetch({
    src: "/api/query-store-products",
    data: { search },
    headers,
  })
    .then((result) => result)
    .catch((e) => ({
      error: e,
      json: null,
    }));
  if (!error) {
  }
  return { error, products: json };
}

/**
 * Create a modal to selecte and add a product to a box
 *
 * @generator
 * @yields {Element} A form and remove/cancel buttons.
 * @param {object} props Property object
 * @param {Function} props.doSave - The save action
 * @param {Function} props.closeModal - The cancel and close modal action
 * @param {string} props.title - Form title
 * @param {object} props.order - The order to be removed
 * @param {string} props.formId - The unique form indentifier
 * @param {object} props.box - The box being edited
 * @param {array} props.boxproducts - The current array of products
 * @param {string} props.type - Included or addon
 */
async function* AddProductToBox(props) {
  const { doSave, closeModal, title, box, boxproducts, type, formId } = props;

  /**
   * Hold loading state.
   *
   * @member {boolean} loading
   */
  let loading = false;
  /**
   * Hold error state.
   *
   * @member {boolean} error
   */
  let error = false;
  /**
   * Products as result of search
   *
   * @member {boolean} products
   */
  let products = null;
  /**
   * Form fields passed to form
   *
   * @member {boolean} fields
   */
  let fields = {
    Product : { // selected from product list
      id: "shopify_product_id",
      type: "hidden",
      datatype: "string",
      required: true,
    },
    Box : { // populated by initial values
      id: "box_id",
      type: "hidden",
      datatype: "string",
      required: true,
    },
    Type : { // populated by initial values, included or addon
      id: "product_type",
      type: "hidden",
      datatype: "string",
      required: true,
    }
  };

  const saveProduct = ({id, title}) => {
    document.getElementById("add-product").shopify_product_id.value = id;
    const form = document.getElementById(formId);
    form.setAttribute("data-shopify_title", title);
    doSave();
  };

  for await (const _ of this) { // eslint-disable-line no-unused-vars

    /**
     * The initial data of the form
     *
     * @function getInitialData
     * @returns {object} The initial data for the form
     * returns the order else compiles reasonable defaults.
     */
    const getInitialData = () => ({ box_id: box._id, product_type: type });

    const inputSearch = async () => {
      loading = true;
      products = [];
      this.refresh();
      const search = document.getElementById("product-search").value;
      if (search === "") {
        products = [];
      } else {
        const result = await getProducts({search});
        error = result.error;
        products = result.products.filter(el => !boxproducts.includes(el.id));
        // need to also filter out from other product list i.e. cannont be both addon and included
      };
      loading = false;
      this.refresh();
    };

    /*
     * Data passed to form to create the toast message to user on doSave of form
     * These values can be arbitary provided that match the template string
     */
    const toastTemplate = {
      template: "Added ${shopify_title} to ${product_type}.",
      shopify_title: box.shopify_title,
      product_type: camelCaseToWords(type),
    };

    yield (
      <Fragment>
        {error ? (
          <Error msg={error} />
        ) : (
          <Fragment>
            <div class="near-black">
              <h6 class="lh-copy tl">
                { box.shopify_title }
              </h6>
              <p class="lh-copy tl">
                Select a product for { box.shopify_title }{" "}
                <b class="pl1 near-black">{ titleCase(camelCaseToWords(type)) }</b>{" "}
                (delivered:{" "}
                <span class="near-black">{box.delivered})</span>.
              </p>
              <div class="mt3">
                <label class="db fw6 lh-copy" for="product-search">Search</label>
                <input class="pa2 input-reset ba bg-transparent hover-bg-near-white w-100 br2" autofocus
                  type="text" name="product-search"  id="product-search" oninput={() => inputSearch()} />
              </div>
            </div>
            { products && (
              products.length ? (
                products.map(el => (
                  <div
                    class="near-black pointer hover-green pa1"
                    onclick={() => saveProduct(el)}>
                    {el.title}
                  </div>
                ))
              ) : (
                loading ? (
                  <div class="lds-ellipsis"><div></div><div></div><div></div><div></div></div>
                ) : (
                  <Fragment>
                    <div class="ba br2 pa3 ml2 mr3 mv1 orange bg-washed-yellow" role="alert">
                      <div class="pa2">No products found for your search.</div>
                    </div>
                  </Fragment>
                )
              )
            )}
            <Form
              data={getInitialData()}
              fields={fields}
              title={title}
              id={formId}
              meta={ toastTemplate }
            />
            <div class="w-90 ph1">
              <Button type="secondary" onclick={closeModal}>
                Cancel
              </Button>
            </div>
          </Fragment>
        )}
      </Fragment>
    );
  }
}

export default FormModalWrapper(AddProductToBox, options);
