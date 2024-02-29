/**
 * Component to render simple textarea input field
 *
 * @module app/form/textarea
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement } from "@b9g/crank";
import FieldWrapper from "./field-wrapper";

/**
 * Component to render simple textarea input field
 *
 * @generator
 * @param {object} props The property object
 * @param {string} props.label The label text
 * @param {string} props.id The form unique identifier for the field
 * @param {string} props.size The width of the field as per tachyons width values
 * @param {string} props.value The current value
 * @param {string} props.valid Is the current selection valid
 * @yields {Element} DOM component to render a textarea field
 */
function* TextAreaField({ label, id, value, valid, size, disabled, hideLabel, ...props}) {

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
            value: ev.target.value,
          },
        })
      );
    }
  };

  this.addEventListener("form.data.collect", collectAndSendData);

  for ({ label, id, value, valid, size, disabled, hideLabel} of this) {
    yield (
      <FieldWrapper label={label} size={size} id={id} hideLabel={hideLabel}>
        <textarea
          class={`mr1 pa2 ba bg-transparent hover-bg-near-white w-100 input-reset br2 ${
            !valid ? "invalid" : "valid"
          }`}
          disabled={disabled}
          rows={disabled ? "2" : (props.rows ? props.rows : 2) }
          id={id}
          style={{ "min-height": disabled ? "30px" : "50px"}}
          {...props}
        >
          {value || ""}
        </textarea>
        <span class={`small mt1 fg-streamside-orange ${valid && "hidden"}`}>
          {label} is required
        </span>
        &nbsp;
      </FieldWrapper>
    );
  }
}

export default TextAreaField;
