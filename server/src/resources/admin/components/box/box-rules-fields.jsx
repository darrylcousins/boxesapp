/**
 * Form fields for
 * * {@link module:app/components/box-rules-add
 * * {@link module:app/components/box-rules-form
 *
 * @module app/components/box-rules-fields
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { Fetch } from "../lib/fetch";

/**
 * The box rules fields
 *
 * @function getBoxRulesFields
 * @returns {object} The form fields keyed by field title string and error (null if no error)
 */
const getBoxRulesFields = async ({rule, disabled}) => {

  const { error, json } = await Fetch("/api/current-box-titles-days")
    .then(result => result)
    .catch(e => ({
      error: e, json: null
    }));

  return {
    error,
    fields: {
      Note: {
        id: rule ? `${rule._id}-note` : "note",
        type: "textarea",
        size: "100",
        datatype: "string",
        required: true,
        placeholder: "Descriptive note of purpose of rule",
        disabled,
      },
      "Boxes": {
        id: rule ? `${rule._id}-boxes` : "boxes",
        type: "checkbox-multiple",
        size: "25",
        required: true,
        multiple: true,
        datatype: "string",
        datalist: json.boxes,
        label: "Select box (multiple)",
        disabled,
      },
      Weekday: {
        id: rule ? `${rule._id}-weekday` : "weekday",
        type: "checkbox-multiple",
        size: "25",
        required: true,
        multiple: true,
        datatype: "string",
        datalist: json.weekdays,
        label: "Select weekday (multiple)",
        disabled,
      },
      Value: {
        id: rule ? `${rule._id}-value` : "value",
        type: "text",
        datatype: "string",
        size: "50",
        required: true,
        placeholder: "String of text to be displayed to user",
        disabled,
      },
      Handle: {
        id: rule ? `${rule._id}-handle` : "handle",
        type: "hidden",
        datatype: "string",
      },
      Title: {
        id: rule ? `${rule._id}-title` : "title",
        type: "hidden",
        datatype: "string",
      },
      Tag: {
        id: rule ? `${rule._id}-tag` : "tag",
        type: "hidden",
        datatype: "string",
      },
    },
  };
};

export default getBoxRulesFields;
