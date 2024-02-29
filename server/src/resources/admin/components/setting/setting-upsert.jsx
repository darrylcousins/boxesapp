/**
 * Creates element to render a modal form for adding or editing a setting. This
 * component sets up the form fields and initial data to render a {@link
 * module:app/form/form~Form|Form}. Essential options for the form are a
 * dictionary of fields and initialData.
 *
 * @module app/components/setting-upsert
 * @requires module:app/form/form~Form
 * @exports UpsertSettingModal
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment } from "@b9g/crank";

import Button from "../lib/button";
import Form from "../form";

/**
 * Create a modal to add or edit a setting
 *
 * @generator
 * @yields {Element} A {@link module:app/form/form~Form|Form} and save/cancel buttons.
 * @param {object} props Property object
 * @param {Function} props.doSave - The save action
 * @param {Function} props.closeModal - The cancel and close modal action
 * @param {string} props.title - Form title
 * @param {object} props.setting - The setting (or null if adding) to be edited
 * @param {string} props.formId - The unique form indentifier
 */
function* UpsertSettingModal(props) {
  const { doSave, closeModal, title, setting, formId } = props;

  const fields = {
    _id: {
      type: "hidden",
      datatype: "string",
    },
    Handle: {
      type: "text",
      size: "third",
      datatype: "string",
      required: true,
    },
    Title: {
      type: "text",
      size: "third",
      datatype: "string",
      required: true,
    },
    Value: {
      type: "textarea",
      datatype: "string",
      size: "third",
      required: true,
    },
    Note: {
      type: "textarea",
      size: "two-thirds",
      datatype: "string",
      required: true,
    },
    Tag: {
      type: "input-select",
      size: "third",
      required: true,
      datatype: "string",
      datalist: ["Translation", "General"],
    },
  };
  /**
   * The initial form data - required by {@link
   * module:app/form/form~Form|Form}.  If a setting is supplied return the setting
   * else compiles reasonable defaults.
   *
   * @function getInitialData
   * @returns {object} The initial form data
   */
  const getInitialData = () => {
    if (typeof setting !== "undefined") {
      return setting;
    }
    const now = new Date();
    return {
      _id: null,
      title: "",
      value: "",
      note: "",
    };
  };

  /*
   * Data passed to form to create the toast message to user on doSave of form
   * These values can be arbitary provided that match the template string
   */
  const toastTemplate = (typeof setting === "undefined") ?
    {
      template: "Added setting.",
    } : {
      template: "Edited setting ${handle}.",
      handle: setting.handle,
  };

  while (true) {
    yield (
      <Fragment>
        <div class="w-90 center ph1">
          <Form
            data={getInitialData()}
            fields={fields}
            title={title}
            id={formId}
            meta={toastTemplate}
          />
          <Button type="primary" onclick={doSave}>
            Save
          </Button>
          <Button type="secondary" onclick={closeModal}>
            Cancel
          </Button>
        </div>
      </Fragment>
    );
  }
}

export default UpsertSettingModal;
