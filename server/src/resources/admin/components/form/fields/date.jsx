/**
 * Component to render simple text input field
 *
 * @module app/form/text
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement } from "@b9g/crank";
import FieldWrapper from "./field-wrapper";

/**
 * Component to render html5 date input field
 *
 * @generator
 * @param {object} props The property object
 * @param {string} props.label The label text
 * @param {string} props.id The form unique identifier for the field
 * @param {string} props.size The width of the field as per tachyons width values
 * @param {Array} props.datatype The datatype of the value to return (string|integer)
 * @param {string} props.valid Is the current selection valid
 * @param {string} props.value The current value
 * @yields {Element} DOM component to render input text field
 */
function* DateField({ label, id, value, size, valid, datatype, disabled, hideLabel, ...props }) {

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
      let { value } = ev.target;
      this.dispatchEvent(
        new CustomEvent("form.data.feed", {
          bubbles: true,
          detail: {
            id,
            value,
          },
        })
      );
    }
  };

  this.addEventListener("form.data.collect", collectAndSendData);

  for ({ label, id, value, size, valid, datatype, disabled, hideLabel, ...props } of this) {
    yield (
      <FieldWrapper label={label} size={size} id={id} hideLabel={hideLabel} margin="pr3">
        <input
          class={`mr1 pa2 ba bg-transparent hover-bg-near-white w-100 input-reset br2 ${
            !valid ? "invalid" : ""
          }`}
          disabled={disabled}
          value={value}
          id={id}
          {...props}
        />
        <span class={`small mt1 fg-streamside-orange ${valid ? "hidden" : ""}`}>
          * required
        </span>
        &nbsp;
      </FieldWrapper>
    );
  }
}

export default DateField;
