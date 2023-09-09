/**
 * Creates element to render modal form to add a box
 *
 * @module app/components/box-add
 * @requires module:app/form/form-modal-wrapper~FormModalWrapper
 * @requires module:app/lib/icon-button~IconButton
 * @exports AddBoxModal
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment } from "@b9g/crank";

import Button from "../lib/button";
import { Fetch, PostFetch } from "../lib/fetch";
import { AddIcon } from "../lib/icon";
import IconButton from "../lib/icon-button";
import Error from "../lib/error";
import FormModalWrapper from "../form/form-modal";
import Form from "../form";
import { dateStringForInput } from "../helpers";

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
  const { name, title, color } = opts;
  return (
    <IconButton color={color} title={title} name={name}>
      <AddIcon />
    </IconButton>
  );
};

/**
 * Options object passed to module:app/components/form-modal~FormModalWrapper
 *
 * @member {object} options
 */
const options = {
  id: "add-box",
  title: "Add Box",
  color: "navy",
  src: "/api/add-box",
  ShowLink,
  saveMsg: "Adding selected box ...",
  successMsg: "Successfully added box, reloading page.",
};

/**
 * Get the Container Box boxes using search term
 *
 * @returns {object} Error (if any) and the boxes
 */
const getBoxes = async ({search, delivered}) => {
  const headers = { "Content-Type": "application/json" };
  const { error, json } = await PostFetch({
    src: "/api/query-store-boxes",
    data: { search, delivered },
    headers,
  })
    .then((result) => {
      return result;
    })
    .catch((e) => ({
      error: e,
      json: null,
    }));
  return { error, boxes: json };
};

/**
 * Get the fields, this only to ascertain if a core box exists
 *
 * @returns {object} Error (if any) and the fields
 */
const getAddFields = async (delivered, onDeliveredChange) => {
  const uri = "/api/get-core-box";
  let { error, json } = await Fetch(uri)
    .then((result) => result)
    .catch((e) => ({
      error: e,
      json: null,
    }));
  if (error && error.message === "Not found") {
    error = null;
  };
  const fields = {};
  if (!error) {
    fields.Box = { // selected from product list
      id: "shopify_product_id",
      type: "hidden",
      datatype: "integer",
      required: true,
    };
    fields.Delivered = {
      id: "delivered",
      type: "date", // needs to be calendar select
      size: "100",
      datatype: "date",
      required: true,
      min: dateStringForInput(),
      onchange: onDeliveredChange,
    };
    if (json) {
      fields["Use Core Box"] = {
        id: "useCoreBox", // we have a core box
        type: "checkbox",
        size: "100",
      };
    };
  }
  return { error, fields };
};

/**
 * Create a modal to select shopify box product to make a box
 *
 * @generator
 * @yields {Element} A form and cancel button.
 * @param {object} props Property object
 * @param {Function} props.doSave - The save action
 * @param {Function} props.closeModal - The cancel and close modal action
 * @param {string} props.title - Form title
 * @param {object} props.order - The order to be removed
 * @param {string} props.formId - The unique form indentifier
 */
async function* AddBox(props) {
  const { doSave, closeModal, title, delivered, formId } = props;

  /**
   * Hold loading state.
   *
   * @member {boolean} loading
   */
  let loading = false;
  /**
   * Hold formValid state.
   *
   * @member {boolean} formValid
   */
  let formValid = true;
  /**
   * Hold fetchError on collecting boxes
   *
   * @member {boolean} fetchError
   */
  let fetchError = false;
  /**
   * Hold shopify_product_id state.
   * This is the product id of the shopify box being added for the date
   *
   * @member {int} shopify_product_id
   */
  let shopify_product_id;
  /**
   * Products as result of search
   *
   * @member {boolean} boxes
   */
  let boxes = null;
  /**
   * Date as changed in the input field
   *
   * @member {boolean} deliveredInput
   */
  let deliveredInput = delivered;

  /*
   * On delivered selection change
   * Load boxes available for the selected box
   * Update pickup options
   */
  const onDeliveredChange = async (ev) => {
    if (!ev.target.checkValidity()) return;
    deliveredInput = ev.target.value;
  };

  /**
   * Form fields passed to form
   *
   * @member {boolean} fields
   */
  const { error, fields } = await getAddFields(delivered, onDeliveredChange);

  /**
   * Update boxes when search term entered
   *
   */
  const inputSearch = async () => {
    loading = true;
    boxes = [];
    this.refresh();
    const search = document.getElementById("product-search").value;
    if (search === "") {
      boxes = [];
    } else {
      const result = await getBoxes({search, delivered: new Date(Date.parse(deliveredInput)).getTime()});
      fetchError = result.error;
      boxes = result.boxes;
    };
    loading = false;
    this.refresh();
  };

  /**
   * Vaidate selected box before submitting form
   *
   */
  const saveBox = async () => {
    if (!document.getElementById("add-box").shopify_product_id.value || !shopify_product_id) {
      document.getElementById("product-search").classList.add("invalid");
      document.getElementById("product-search-alert").classList.remove("dn");
      document.getElementById("product-search-alert").classList.add("db");
    } else if (shopify_product_id) {
      document.getElementById("add-box").shopify_product_id.value = parseInt(shopify_product_id);
      /*
      console.log('shopify_product_id', shopify_product_id);
      console.log('add box value', document.getElementById("add-box").shopify_product_id.value);
      console.log('delivered value', document.getElementById("add-box").delivered.value);
      */
      doSave();
    };
  };

  /**
   * Update shopify_product_id hidden field on box selection
   *
   */
  const saveBoxId = ({id, title}) => {
    document.getElementById("add-box").shopify_product_id.value = id;
    document.getElementById(id.toString()).classList.remove("dn");
    document.getElementById("product-search").value = title;
    document.getElementById("product-search-alert").classList.remove("db");
    document.getElementById("product-search-alert").classList.add("dn");
    shopify_product_id = id; // don't refresh because form data is lost
  };

  for await (const _ of this) { // eslint-disable-line no-unused-vars

    /**
     * The initial data of the form
     *
     * @function getInitialData
     * @returns {object} The initial data for the form
     */
    const getInitialData = () => {
      return {shopify_product_id, delivered: dateStringForInput(deliveredInput)};
    };

    /*
     * Data passed to form to create the toast message to user on doSave of form
     * These values can be arbitary provided that match the template string
     */
    const toastTemplate = {
      template: "Added box.",
    };

    yield (
      <Fragment>
        {fetchError && <Error msg={fetchError} />}
        {error ? (
          <Error msg={error} />
        ) : (
          <Fragment>
            <div class="near-black">
              <p class="lh-copy tl">
                Select a delivery date and the container box from shopify store boxes.
              </p>
              <div class="tl ph2 mt1 ml0 mr3">
                <label class="db fw6 lh-copy" for="product-search">Search in store boxes</label>
                <input
                  class="mr1 pa2 ba bg-transparent hover-bg-near-white w-100 input-reset br2" required
                  type="text" name="product-search"  id="product-search" oninput={() => inputSearch()} />
                  <span
                    class={`small mt1 fg-streamside-orange ${formValid ? "dn" : "db"}`}
                    id="product-search-alert"
                  >
                  A box is required
                </span>
              </div>
              <div class="mt3 tl">
                { boxes && (
                  boxes.length ? (
                    boxes.map(el => (
                      <div
                        class="near-black pointer hover-green pa1 b"
                        onclick={() => saveBoxId(el)}>
                        <span class="dn" id={el.id}>✓</span>{el.title}
                      </div>
                    ))
                  ) : (
                    loading ? (
                      <div class="lds-ellipsis"><div></div><div></div><div></div><div></div></div>
                    ) : (
                      <Fragment>
                        <div class="ba br2 pa3 ml2 mr3 mv1 orange bg-washed-yellow" role="alert">
                          <div class="pa2">No boxes found for your search.</div>
                          <div class="pa2">Are all the container boxes already included for { new Date(deliveredInput).toDateString() }?</div>
                        </div>
                      </Fragment>
                    )
                  )
                )}
              </div>
            </div>
            <Form
              data={getInitialData()}
              fields={fields}
              title={title}
              id={formId}
              meta={toastTemplate}
            />
            <div class="tr">
              <Button type="primary" onclick={saveBox}>
                Add Box
              </Button>
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

export default FormModalWrapper(AddBox, options);
