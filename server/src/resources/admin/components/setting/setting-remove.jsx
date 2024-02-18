/**
 * Creates element to render modal form to remove a setting.
 *
 * @module app/components/setting-remove
 * @requires module:app/form/form-modal-wrapper~FormModalWrapper
 * @requires module:app/lib/icon-button~IconButton
 * @requires module:app/components/setting-upsert~UpsertSettingModal
 * @exports RemoveSettingModal
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment } from "@b9g/crank";

import { DeleteIcon } from "../lib/icon";
import Button from "../lib/button";
import IconButton from "../lib/icon-button";
import FormModalWrapper from "../form/form-modal";
import Form from "../form";

/**
 * Icon button for link to expand modal
 *
 * @function ShowLink
 * @param {object} opts Options that are passed to {@link module:app/lib/icon-button~IconButton|IconButton}
 * @param {string} opts.name Name as identifier for the action
 * @param {string} opts.title Hover hint
 * @param {string} opts.color Icon colour
 * @returns {Element} An icon button
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
  id: "remove-setting", // form id
  title: "Remove Setting",
  color: "dark-red",
  src: "/api/remove-setting",
  ShowLink,
  saveMsg: "Removing setting ...",
  successMsg: "Successfully removed setting, reloading page.",
};

/**
 * Create a modal to remove a setting
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
function* RemoveSetting(props) {
  const { doSave, closeModal, title, setting, formId } = props;

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

  /*
   * Data passed to form to create the toast message to user on doSave of form
   * These values can be arbitary provided that match the template string
   */
  const toastTemplate = (typeof setting === "undefined") ?
    {
      template: "Deleted setting.",
    } : {
      template: "Deleted setting ${handle}.",
      handle: setting.handle,
  };

  /**
   * The initial data of the form
   *
   * @function getInitialData
   * @returns {object} The initial data for the form
   * returns the order else compiles reasonable defaults.
   */
  const getInitialData = () => ({ _id: setting._id });

  while (true) {
    yield (
      <Fragment>
        <p class="lh-copy tl">
          Are you sure you want to remove
          <b class="pl1">{setting.title}</b>?
        </p>
        <Form
          data={getInitialData()}
          fields={fields}
          title={title}
          id={formId}
          meta={toastTemplate}
        />
        <div class="w-90 center ph1">
          <Button type="primary" onclick={doSave}>
            Remove
          </Button>
          <Button type="secondary" onclick={closeModal}>
            Cancel
          </Button>
        </div>
      </Fragment>
    );
  }
}

export default FormModalWrapper(RemoveSetting, options);
