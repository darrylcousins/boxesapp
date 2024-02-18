/**
 * Creates element to render modal form to remove a single order.
 *
 * @module app/components/order-remove
 * @requires module:app/form/form-modal-wrapper~FormModalWrapper
 * @requires module:app/lib/icon-button~IconButton
 * @exports RemoveOrderModal
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment } from "@b9g/crank";
import { DeleteIcon } from "../lib/icon";
import Button from "../lib/button";
import IconButton from "../lib/icon-button";
import FormModalWrapper from "../form/form-modal";
import Form from "../form";
import { capWords } from "../helpers";

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
 * Options object passed to module:app/components/form-modal~FormModalWrapper
 *
 * @member {object} options
 */
const options = {
  id: "remove-order", // form id
  title: "Remove Order",
  color: "dark-red",
  src: "/api/remove-order",
  ShowLink,
  saveMsg: "Removing order ...",
  successMsg: "Successfully removed order, reloading page.",
};

/**
 * Create a modal to remove an order.
 *
 * @generator
 * @yields {Element} A form and remove/cancel buttons.
 * @param {object} props Property object
 * @param {Function} props.doSave - The save action
 * @param {Function} props.closeModal - The cancel and close modal action
 * @param {string} props.title - Form title
 * @param {object} props.order - The order to be removed
 * @param {string} props.formId - The unique form indentifier
 */
function* RemoveOrder(props) {
  const { doSave, closeModal, title, order, formId } = props;

  /**
   * The form fields - required by {@link module:app/form/form~Form|Form}.
   *
   * @member {object} fields The form fields keyed by field title string
   */
  const fields = {
    _id: {
      type: "hidden",
      datatype: "string",
    },
  };

  /**
   * The initial data of the form
   *
   * @function getInitialData
   * @returns {object} The initial data for the form
   * returns the order else compiles reasonable defaults.
   */
  const getInitialData = () => {
    const data = { 
      _id: order._id,
    };
    console.log(order);
    console.log(data);
    return data;
  };

  const FormatSource = ({ source }) => {
    return (typeof source === "string") ? (
      <Fragment>
        { source.split(",").map(el => el.trim()).map(name => (
          <span>{ name } </span>
        ))}
      </Fragment>
    ) : (
      <Fragment>
        <span>{ capWords(source.type.split("_")).join(" ") } </span>
        <span>{ source.name }</span>
      </Fragment>
    );
  };

  /*
   * Data passed to form to create the toast message to user on doSave of form
   * These values can be arbitary provided that match the template string
   */
  const toastTemplate = {
    template: "Removed order #${order_number}.",
    order_number: order.order_number,
  };

  while (true) {
    yield (
      <Fragment>
        <p class="lh-copy tl">
          Are you sure you want to remove the order
          <b class="ph1">#{order.order_number}</b>
          for
          <b class="ph1">{order.name} &lt;{order.contact_email}&gt;</b>?
        </p>
        <p class="lh-copy tl">
          <span class="ph1">(<FormatSource source={order.source} />, {order.delivered})</span>
        </p>
        <Form
          data={getInitialData()}
          fields={fields}
          title={title}
          id={formId}
          meta={toastTemplate}
        />
        <div class="tr">
          <Button type="primary" onclick={doSave}>
            Remove Order
          </Button>
          <Button type="secondary" onclick={closeModal}>
            Cancel
          </Button>
        </div>
      </Fragment>
    );
  }
}

/**
 * Wrapped component
 *
 * @member {object} RemoveOrderModal
 */
export default FormModalWrapper(RemoveOrder, options);
