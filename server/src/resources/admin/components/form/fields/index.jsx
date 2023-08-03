/**
 * A field component to render form elements
 *
 * @module app/form/index
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement } from "@b9g/crank";

import Checkbox from "./checkbox";
import CheckboxMultiple from "./checkbox-multiple";
import TextField from "./text";
import TextArea from "./textarea";
import Hidden from "./hidden";
import InputSelect from "./input-select";
import InputMultipleSelect from "./input-multiple";
import File from "./file";
import DateField from "./date";
import Error from "../../lib/error";
import { hasOwnProp } from "../../helpers";


/**
 * A field component to render form elements
 *
 * @function Field
 * @param {object} props The property object
 * @param {object} props.data The form data containing current values
 * @param {object} props.formElements The formElements representing the rendered DOM
 * @param {string} props.label The label text
 * @param {object} props.options The field options
 * @param {string} props.options.id The form unique identifier for the field
 * @param {string} props.options.type The type of input field to render (text, checkbox, hidden etc)
 * @param {string} props.options.size The width of the field as per tachyons width values
 * @param {boolean} props.options.required Is this a required field
 * @param {Array} props.options.datalist The selectable values
 * @param {string} props.options.datatype The datatype of the returned values `string|integer|boolean`
 * @returns {Element} The field DOM component to be rendered
 */
function *Field({ index, label, hideLabel, options, data, formElements, ...props}) {

  /**
   * Event handler on focus, remove invalid state of field
   *
   * @function onFocus
   * @param {object} ev The event
   * @listens focus
   */
  const onFocus = (ev) => {
    const el = ev.target;
    el.classList.remove("invalid");
    if (el.nextSibling) {
      el.nextSibling.innerHTML = "";
      el.nextSibling.classList.add("hidden");
    }
    if (el.previousSibling) {
      el.previousSibling.classList.remove("fg-streamside-orange");
    }
  };

  /**
   * Event handler on blur, add invalid state to field after checking for
   * validity using html5 validation
   *
   * @function onBlur
   * @param {object} ev The event
   * @listens blur
   */
  const onBlur = (ev) => {
    const el = ev.target;
    if (!el.checkValidity()) {
      //console.log(el);
      if (el.nextSibling) {
        el.nextSibling.innerHTML = el.validationMessage;
        el.nextSibling.classList.remove("hidden");
      }
      if (el.previousSibling) {
        el.previousSibling.classList.add("fg-streamside-orange");
      }
    }
  };

  for ({ index, label, hideLabel, options, data, formElements, ...props} of this) {

    let { type, size, required, datalist, datatype, multiple, ...fieldOptions } = options;
    let { id } = options;
    fieldOptions.hideLabel = hideLabel;

    if (typeof id === "undefined") {
      id = label.toLowerCase().replace(/ /g, "-");
    };
    
    let value = data[id]; // can be expected as undefined

    let valid = true;

    // see https://github.com/eslint/eslint/blob/master/docs/rules/no-prototype-builtins.md
    if (hasOwnProp.call(formElements, id) && type !== 'checkbox-multiple') { // could have unplanned effects but solve of multiple select
      valid = formElements[id].checkValidity();
      if (formElements[id].value !== "undefined") {
        value = formElements[id].value;
      };
    };
    if (type === 'checkbox-multiple') {
      // how to account for validity
      if (required === true && typeof value === "undefined") {
        valid = false;
      };
    };
    if (type === 'text') {
      // how to account for validity
      if (required === true && typeof value === "undefined") {
        valid = false;
      };
    };

    if (type === "hidden") {
      yield (
        <Hidden
          value={value}
          name={id}
          type={type}
          id={id}
          datatype={datatype}
          required={required}
          />
      );
    } else if (type === "file") {
      yield (
        <File
          name={id}
          type={type}
          id={id}
          datatype={datatype}
          required={required}
          valid={valid}
        />
      );
    } else if (type === "textarea") {
      yield (
        <TextArea
          value={value}
          name={id}
          label={label}
          id={id}
          size={size}
          required={required}
          valid={valid}
          onfocus={onFocus} // addEventListener???
          onblur={onBlur}
          datatype={datatype}
          {...fieldOptions}
        />
      );
    } else if (type === "text") {
      yield (
        <TextField
          value={value}
          name={id}
          label={label}
          id={id}
          index={index}
          size={size}
          required={required}
          valid={valid}
          onfocus={onFocus} // addEventListener???
          onblur={onBlur}
          datatype={datatype}
          type={datatype === "number" ? datatype : type}
          {...fieldOptions}
        />
      );
    } else if (type === "date") {
      const { min, max } = options;
      yield (
        <DateField
          value={value}
          name={id}
          label={label}
          id={id}
          size={size}
          required={required}
          valid={valid}
          onfocus={onFocus} // addEventListener???
          onblur={onBlur}
          datatype={datatype}
          type={type}
          {...fieldOptions}
        />
      );
    } else if (type === "checkbox") {
      yield (
        <Checkbox
          value={value}
          name={id}
          label={label}
          id={id}
          size={size}
          required={required}
          valid={valid}
          datatype={datatype}
          {...fieldOptions}
        />
      );
    } else if (type === "input-select") {
      yield (
        <InputSelect
          value={value}
          name={id}
          label={label}
          id={id}
          size={size}
          type={type}
          required={required}
          valid={valid}
          onfocus={onFocus} // addEventListener???
          onblur={onBlur}
          datalist={datalist}
          datatype={datatype}
          {...fieldOptions}
        />
      );
    } else if (type === "input-multiple") {
      yield (
        <InputMultipleSelect
          value={value}
          name={id}
          label={label}
          id={id}
          type={type}
          size={size}
          required={required}
          valid={valid}
          onfocus={onFocus} // addEventListener???
          onblur={onBlur}
          datalist={datalist}
          datatype={datatype}
          {...fieldOptions}
        />
      );
    } else if (type === "checkbox-multiple") {
      yield (
        <CheckboxMultiple
          value={value}
          name={id}
          label={label}
          id={id}
          type={type}
          size={size}
          required={required}
          valid={valid}
          onfocus={onFocus} // addEventListener???
          onblur={onBlur}
          datalist={datalist}
          datatype={datatype}
          multiple={multiple}
          {...fieldOptions}
        />
      );
    } else {
      yield (<Error msg="Failed to find input element to render" />);
    };
  };
};

export default Field;
