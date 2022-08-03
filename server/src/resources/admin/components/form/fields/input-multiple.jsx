/**
 * Component to render a multiple input comma separated field with selectable
 * values using html5 datalist attribute
 *
 * @module app/form/input-multiple
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement } from "@b9g/crank";
import FieldWrapper from "./field-wrapper";

/**
 * Component to render a multiple input comma separated field with selectable
 * values using html5 datalist attribute
 *
 * @generator
 * @param {object} props The property object
 * @param {string} props.label The label text
 * @param {string} props.id The form unique identifier for the field
 * @param {string} props.size The width of the field as per tachyons width values
 * @param {Array} props.datalist The selectable values
 * @param {string} props.datatype The datatype of the returned values `string|integer|boolean`
 * @param {string} props.value The current selected values
 * @param {string} props.valid Is the current selection valid
 * @yields {Element} DOM component to render comma seperated input field
 */
function* InputMultipleSelect({ label, id, value, size, valid, datatype, datalist, disabled, hideLabel, ...props}) {

  const separator = ","; // TODO move to props if necessary

  /**
   * @member {number} Hold a count of selected values
   */
  let selectedValueCount;

  /**
   * @member {Array} Hold the current selected values
   */
  let selectedValues;

  // initialize the current values
  if (value && typeof value !== "undefined") {
    selectedValues = datalist;
    if (typeof value === "string") {
      selectedValueCount = value.split(separator).length;
    } else {
      selectedValueCount = value.length;
    }
  } else {
    // initialize
    selectedValueCount = null;
    selectedValues = null;
  }

  /**
   * Populate the input element list of values
   *
   * @function fillDatalist
   * @param {object} input The input DOM element
   * @param {Array} optionValues The possible values
   * @param {string} optionPrefix The current string in the input
   */
  const fillDatalist = (input, optionValues, optionPrefix) => {
    const { list } = input;
    if (list && optionValues.length > 0) {
      list.innerHTML = "";
      const usedOptions = optionPrefix.split(separator).map((el) => el.trim());
      // for (const optionsValue of optionValues) {
      optionValues.forEach((val) => {
        if (usedOptions.indexOf(val) < 0) {
          // Skip used values
          const option = document.createElement("option");
          option.value = optionPrefix + val;
          list.append(option);
        }
      });
    }
  };

  /**
   * Event handler on input, calculate option values selectable and update
   * datalist for the input
   *
   * @function handleInput
   * @param {object} ev The event
   * @listens input
   */
  const handleInput = async (ev) => {
    console.log("got event on input");
    if (ev.target.tagName === "INPUT") {
      const input = ev.target;
      if (selectedValueCount === null) {
        selectedValues = Array.from(input.list.options).map((opt) => opt.value);
        selectedValueCount = input.value.split(separator).length;
      }
      const currentValueCount = input.value.split(separator).length;
      if (selectedValueCount !== currentValueCount) {
        const lsIndex = input.value.lastIndexOf(separator);
        const str =
          lsIndex !== -1 ? input.value.substr(0, lsIndex) + separator : "";
        fillDatalist(input, selectedValues, str);
        selectedValueCount = currentValueCount;
      }
    }
  };

  this.addEventListener("input", handleInput);

  /**
   * Event handler when {@link
   * module:form/form-modal~FormModalWrapper|FormModalWrapper} sends for data
   *
   * @function collectAndSendData
   * @param {object} ev The event
   * @listens form.data.feed
   */
  const collectAndSendData = (ev) => {
    if (ev.target.id === id) {
      this.dispatchEvent(
        new CustomEvent("form.data.feed", {
          bubbles: true,
          detail: {
            id,
            value: ev.target.value.split(",").map(el => el.trim()),
          },
        })
      );
    }
  };
  this.addEventListener("form.data.collect", collectAndSendData);

  for ({ label, id, value, size, valid, datalist, datatype, disabled, hideLabel } of this) {
    yield (
      <FieldWrapper label={label} size={size} id={id} hideLabel={props.hideLabel}>
        <input
          class={`mr1 pa2 ba bg-transparent hover-bg-near-white w-100 input-reset br2 ${
            !valid ? "invalid" : ""
          }`}
          list={`${id}s`}
          {...props}
        />
        <span class={`small mt1 fg-streamside-orange ${valid && "hidden"}`}>
          {label} is required
        </span>
        &nbsp;
        <datalist id={`${id}s`}>
          {datalist.map((el) => (
            <option>{el}</option>
          ))}
        </datalist>
      </FieldWrapper>
    );
  };
}

export default InputMultipleSelect;