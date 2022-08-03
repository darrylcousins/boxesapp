/**
 * Creates element to render modal form to duplicate a box
 *
 * @module app/components/box-duplicate
 * @requires module:app/form/form-modal-wrapper~FormModalWrapper
 * @requires module:app/lib/icon-button~IconButton
 * @exports DuplicateBoxModal
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment } from "@b9g/crank";

import Button from "../lib/button";
import { Fetch, PostFetch } from "../lib/fetch";
import { CopyIcon } from "../lib/icon";
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
      <CopyIcon />
    </IconButton>
  );
};

/**
 * Options object passed to module:app/components/form-modal~FormModalWrapper
 *
 * @member {object} options
 */
const options = {
  id: "duplicate-box",
  title: "Duplicate Box",
  color: "navy",
  src: "/api/duplicate-box",
  ShowLink,
  saveMsg: "Duplicating selected box ...",
  successMsg: "Successfuly duplicated box, reloading page.",
};

/**
 * Get the Container Box boxes using search term
 *
 * @returns {object} Error (if any) and the boxes
 */
const getBoxes = async ({search}) => {
  const headers = { "Content-Type": "application/json" };
  const { error, json } = await PostFetch({
    src: "/api/query-store-boxes",
    data: { search },
    headers,
  })
    .then((result) => {
      return result;
    })
    .catch((e) => ({
      error: e,
      json: null,
    }));
  return { error, json };
}

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
async function* DuplicateBox(props) {
  const { doSave, closeModal, title, box, formId } = props;

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
   * This is the product id of the shopify box being duplicateed for the date
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
   * Form fields passed to form
   *
   * @member {boolean} fields
   */
  const fields = {
    Box: {
      id: "shopify_product_id",
      type: "hidden",
      datatype: "integer",
      required: true,
    },
    BoxId: {
      id: "boxId",
      type: "hidden",
      datatype: "string",
      required: true,
    }
  };

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
      const result = await getBoxes({search});
      fetchError = result.error;
      boxes = result.json.filter(el => el.id !== box.shopify_product_id);
    };
    loading = false;
    this.refresh();
  };

  /**
   * Vaidate selected box before submitting form
   *
   */
  const saveBox = async () => {
    if (!document.getElementById("duplicate-box").shopify_product_id.value || !shopify_product_id) {
      document.getElementById("product-search").classList.add("invalid");
      document.getElementById("product-search-alert").classList.remove("dn");
      document.getElementById("product-search-alert").classList.add("db");
    } else if (shopify_product_id) {
      document.getElementById("duplicate-box").shopify_product_id.value = parseInt(shopify_product_id);
      /*
      console.log('shopify_product_id', shopify_product_id);
      console.log('duplicate box value', document.getElementById("duplicate-box").shopify_product_id.value);
      console.log('delivered value', document.getElementById("duplicate-box").delivered.value);
      */
      doSave();
    };
  };

  /**
   * Update shopify_product_id hidden field on box selection
   *
   */
  const saveBoxId = ({id, title}) => {
    console.log(id, title);
    document.getElementById("duplicate-box").shopify_product_id.value = id;
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
      const data = {shopify_product_id, boxId: box._id};
      return data;
    };

    /*
     * Data passed to form to create the toast message to user on doSave of form
     * These values can be arbitary provided that match the template string
     */
    const toastTemplate = {
      template: "Duplicated box.",
    };

    yield (
      <Fragment>
        {fetchError && <Error msg={fetchError} />}
        <Fragment>
          <div class="near-black">
            <p class="lh-copy tl">
              Duplicating <b>{ box.shopify_title }</b> on <b>{ box.delivered }</b>.{ " " }
            </p>
            <p class="lh-copy tl">
              Select a new container box from shopify store boxes.
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
                      class="near-black pointer hover-green pa1"
                      onclick={() => saveBoxId(el)}>
                      <span class="fa fa-check dn" id={el.id} />{el.title}
                    </div>
                  ))
                ) : (
                  loading ? (
                    <div class="lds-ellipsis"><div></div><div></div><div></div><div></div></div>
                  ) : (
                    <Fragment>
                      <div class="ba br2 pa3 ml2 mr3 mv1 orange bg-washed-yellow" role="alert">
                        <div class="pa2">No boxes found for your search.</div>
                        <div class="pa2">Are all the container boxes already included for { box.delivered }?</div>
                      </div>
                    </Fragment>
                  )
                )
              )
              }
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
              Duplicate Box
            </Button>
            <Button type="secondary" onclick={closeModal}>
              Cancel
            </Button>
          </div>
        </Fragment>
      </Fragment>
    );
  }
}

export default FormModalWrapper(DuplicateBox, options);
