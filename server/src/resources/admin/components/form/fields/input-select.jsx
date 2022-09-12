/**
 * Component to render an input field with selectable
 * values using html5 datalist attribute
 *
 * @module app/form/input-select
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment } from "@b9g/crank";
import FieldWrapper from "./field-wrapper";

/**
 * Component to render an input field with selectable
 * values using html5 datalist attribute
 *
 * @generator
 * @param {object} props The property object
 * @param {string} props.label The label text
 * @param {string} props.id The form unique identifier for the field
 * @param {string} props.size The width of the field as per tachyons width values
 * @param {Array} props.datalist The selectable values
 * @param {string} props.valid Is the current selection valid
 * @yields {Element} DOM component to render input field with selectable values
 * using datalist attribute
 *
 */
function* InputSelectField({ label, id, value, size, valid, datatype, datalist, disabled, hideLabel, ...props}) {

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

  /**
   * Event handler on focus, remove value to allow dropdown
   *
   * @function onFocus
   * @param {object} ev The event
   * @listens focus
   */
  const onClick = (ev) => {
    return;
    if (!disabled) {
      const el = document.querySelector(`select[name='${props.name}']`);
      el.value = "";
      //el.select();
    }
  };

  this.addEventListener("click", onClick);

  for ({ label, id, value, size, valid, datalist, datatype, disabled, hideLabel } of this) {
    yield (
      <Fragment>
        <style type="text/css">
          {`
select {
  border: none;
  margin: 0;
  font-family: inherit;
  font-size: inherit;
  cursor: inherit;
  line-height: inherit;
  background-image: linear-gradient(45deg,transparent 50%,#162842 50%),linear-gradient(135deg,#162842 50%,transparent 50%);
  //background-position: calc(100% - 27px) calc(1rem + 10px),calc(100% - 23px) calc(1rem + 10px);
  background-position: calc(100% - 27px),calc(100% - 23px);
  background-size: 4px 4px,4px 4px;
  background-repeat: no-repeat;
}
          `}

        </style>
      <FieldWrapper label={label} size={size} id={id} hideLabel={hideLabel}>
        <select
          class={`mr1 pa2 pl3 ba bg-transparent hover-bg-near-white w-100 input-reset br2 ${
            !valid ? "invalid" : ""
          }`}
          disabled={disabled}
          id={id}
          pattern={ datalist.join("|") }
          {...props}
        >
          {datalist.map((el) => (
            <option selected={ el === value}>{el}</option>
          ))}
        </select>
        <span class={`small mt1 fg-streamside-orange ${valid ? "hidden" : ""}`}>
          {label}
          &nbsp; is required
        </span>
      </FieldWrapper>
    </Fragment>
    );
  }
};
// value={value}

export default InputSelectField;
