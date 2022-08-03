/**
 * Creates element to render modal form for deleting orders. This includes
 * making a selection of order `sources` to remove, i.e. all `CSA` orders only
 * leaving `Shopify` orders which are removed via webhook when they are marked
 * as `fulfilled` in the Shopify admin.
 *
 * @module app/components/orders-remove
 * @requires module:app/form/form~Form
 * @requires module:app/form/form-modal-wrapper~FormModalWrapper
 * @exports RemoveOrders
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment } from "@b9g/crank";

import Error from "../lib/error";
import BarLoader from "../lib/bar-loader";
import Button from "../lib/button";
import { DeleteIcon } from "../lib/icon";
import { PostFetch } from "../lib/fetch";
import IconButton from "../lib/icon-button";
import FormModalWrapper from "../form/form-modal";
import Form from "../form";

/**
 * Icon component for link to expand modal
 *
 * @function ShowLink
 * @param {object} opts Options that are passed to {@link module:app/lib/icon-button~IconButton|IconButton}
 * @param {string} opts.name Name as identifier for the action
 * @param {string} opts.title Hover hint and hidden span
 * @param {string} opts.color Icon colour
 * @returns {Element} IconButton
 */
const ShowLink = (opts) => {
  const { name, title, color } = opts;
  return (
    <IconButton color={color} title={title} name={name}>
      <DeleteIcon />
    </IconButton>
  );
};

/**
 * Options object passed to module:app/components/form-modal-wrapper~FormModalWrapper
 *
 * @member {object} options
 */
const options = {
  id: "remove-orders", // form id
  title: "Remove Orders",
  color: "dark-red",
  src: "/api/remove-orders",
  ShowLink,
  saveMsg: "Removing orders ...",
  successMsg: "Successfully removed X orders, reloading page.",
};

/**
 * Get the fields, this includes the sources. May also return error if fetch fails.
 *
 * @see {@link module:app/components/orders-remove~fields|fields}
 * @param {string} delivered Delivery date as string
 * @returns {object} Error (if any) and the fields
 */
const getRemoveFields = async (delivered) => {
  const headers = { "Content-Type": "application/json" };
  const { error, json } = await PostFetch({
    src: "/api/order-sources",
    data: { delivered },
    headers,
  })
    .then((result) => result)
    .catch((e) => ({
      error: e,
      json: null,
    }));
  const fields = {};
  if (!error) {
    fields.Delivered = {
      id: "delivered",
      type: "hidden",
      datatype: "string",
    };
    fields.Sources = {
      id: "sources",
      type: "checkbox-multiple",
      size: "100",
      datatype: "array",
      datalist: json,
    };
  }
  return { error, fields };
};

/**
 * Create a modal to remove a set of orders
 *
 * @generator
 * @yields {Element} A form and save/cancel buttons.
 * @param {object} props Property object
 * @param {Function} props.doSave - The save action
 * @param {Function} props.closeModal - The cancel and close modal action
 * @param {string} props.title - Form title
 * @param {object} props.order - The order (or null if adding) to be edited
 * @param {string} props.delivered - The delivery date as a string
 * @param {string} props.formId - The unique form indentifier
 */
async function* RemoveOrders(props) {
  const { doSave, closeModal, title, delivered, formId } = props;

  for await (const _ of this) { // eslint-disable-line no-unused-vars
    yield <BarLoader />;

    /**
     * Fields of the form
     * * `delivered`: Delivery date of orders to be removed
     * * `sources`: Source type to remove `Shopify|CSA|BuckyBox`
     *
     * @see {@link module:app/components/orders-remove~getRemoveFields|getRemoveFields}
     * @member {object} fields
     */
    /**
     * Error if fetching box delivery dates fails
     *
     * @member {object|string} error
     */
    const { error, fields } = await getRemoveFields(delivered);

    /**
     * The initial form data - required by {@link
     * module:app/form/form~Form|Form}.  If an order supplied returns the order
     * else compiles reasonable defaults.
     *
     * @function getInitialData
     * @returns {object} The initial form data
     */
    const getInitialData = () => ({ delivered });

    yield (
      <Fragment>
        {error ? (
          <Error msg={error} />
        ) : (
          <div class="w-90 center ph1">
            <h3>{delivered}</h3>
            <p class="lh-copy near-black tl">
              Use the checkboxes to filter orders by sources. Removing orders
              here makes
              <b class="ph1">no</b>
              changes to the orders on Shopify nor to the original imported
              files from BuckyBox or CSA.
            </p>
            <p class="lh-copy near-black tl">
              It would not be advised to delete any orders matching
              &apos;Shopify&apos; as they are automatically inserted when
              created on the store and will be removed when fulfilled.
            </p>
            <Form
              data={getInitialData()}
              fields={fields}
              title={title}
              id={formId}
            />
            <Button type="primary" onclick={doSave}>
              Delete Orders
            </Button>
            <Button type="secondary" onclick={closeModal}>
              Cancel
            </Button>
          </div>
        )}
      </Fragment>
    );
  }
}

export default FormModalWrapper(RemoveOrders, options);