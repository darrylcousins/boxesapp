/**
 *
 * @module app/form/filter-select
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement } from "@b9g/crank";

/**
 * Renders a select field for generating filters
 *
 * @generator
 * @param {object} props The property object
 * @param {string} props.name The input id and name
 * @param {Array} props.fields The selectable fields as strings
 * @param {string} props.position The horizontal position - to group the fields nicely
 * @param {string} props.type The type, or more correctly the field that will be filtered
 * @param {Function} props.callback The callback function to call with the selected value
 * @yields {Element} A select field
 */
function* FilterSelect({ name, fields, position, type, callback }) {
  /**
   * Style selection according to props.position to add rounded corners as
   * necessary to render grouped elements
   *
   * @member {string}
   */
  let borders = "ba";
  if (position === "left") borders = "bt bb bl br-0 br--left";
  if (position === "center") borders = "ba br--left br--right";
  if (position === "right") borders = "bt bb br bl-0 br--right";
  if (position === "single") borders = "ba";

  /**
   * Event handler on select change
   *
   * @function handleChange
   * @param {object} ev The event
   * @listens change
   */
  const handleChange = async (ev) => {
    const el = ev.target;
    callback(el.value, type);
    [el.value] = fields;
  };

  this.addEventListener("change", handleChange);

  while (true) {
    yield (
      <select
        class={`pa1 bg-transparent hover-bg-near-white dib ${borders} br2 b--mid-gray mid-gray`}
        id={name}
        name={name}
      >
        {fields.map((el) => (
          <option value={el}>{el}</option>
        ))}
      </select>
    );
  }
}

export default FilterSelect;