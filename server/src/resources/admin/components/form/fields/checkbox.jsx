/**
 * A checkbox field for boolean values
 *
 * @module app/form/checkbox
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement } from "@b9g/crank";
import FieldWrapper from "./field-wrapper";

/**
 * Renders a checkbox field.
 *
 * @generator
 * @param {object} props The property object
 * @param {string} props.label The label text
 * @param {string} props.id The form unique identifier for the field
 * @param {string} props.size The width of the field as per tachyons width values
 * @param {boolean} props.value The inital value
 * @param {string} props.datatype The datatype of the returned values `string|integer|boolean`
 * @yields {Element} A checkbox as DOM component
 */
function* CheckboxField(props) {
  const { label, size, id, value, datatype } = props;

  /**
   * Store the current selected value
   *
   * @member {boolean} selected
   */
  let selected = value;

  /**
   * Event handler on user click to update selected array
   *
   * @function handleClick
   * @param {object} ev The event
   * @listens click
   */
  const handleClick = async (ev) => {
    const tagName = ev.target.tagName.toUpperCase();
    if (tagName === "LABEL" || tagName === "INPUT") {
      selected =
        tagName === "LABEL"
          ? ev.target.nextElementSibling.checked
          : ev.target.checked;
      this.refresh();
    }
  };

  this.addEventListener("click", handleClick);

  /**
   * Event handler when {@link
   * module:form/form-modal~FormModalWrapper|FormModalWrapper} sends for data
   *
   * @function collectAndSendData
   * @param {object} ev The event
   * @listens form.data.feed
   */
  const collectAndSendData = (ev) => {
    if (ev.target.name === id) {
      // note use of name here
      this.dispatchEvent(
        new CustomEvent("form.data.feed", {
          bubbles: true,
          detail: {
            id,
            value: Boolean(selected), // may be undefined
          },
        })
      );
    }
  };

  this.addEventListener("form.data.collect", collectAndSendData);

  while (true) {
    yield (
      <FieldWrapper label={label} size={size} id={id} hideLabel={props.hideLabel}>
        <input
          class="mh2 pa2 ba bg-transparent hover-bg-near-white br2 db"
          type="checkbox"
          checked={selected}
          id={id}
          name={id}
          datatype={datatype}
          {...props}
        />
      </FieldWrapper>
    );
  }
}

export default CheckboxField;
