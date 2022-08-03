/**
 * Field wrapper supplying the label for the wrapped form element and
 * conforming styles
 *
 * @module app/form/field-wrapper
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement } from "@b9g/crank";

/**
 * Simple wrapper to give conformity of style and label to all field elements
 *
 * @function FieldWrapper
 * @param {object} props The property object
 * @param {string} props.label The label text
 * @param {string} props.children The wrapped elements
 * @param {string} props.size The width of the field as per tachyons width values
 * @param {string} props.id The id of the wrapped element
 * @returns {Element} A wrapped label and child component
 */
function FieldWrapper(props) {
  const { children, label, hideLabel, size, id, margin } = props;
  return (
    <div class={`ttn fl w-${size} ${margin ? margin : ""}`}>
      <div class="tl ph2 mt1 ml0">
        <label class={`fw6 lh-copy${hideLabel ? " dn": ""}`} htmlFor={id} for={id}>
          {label}
        </label>
        {children}
      </div>
    </div>
  );
}

export default FieldWrapper;
