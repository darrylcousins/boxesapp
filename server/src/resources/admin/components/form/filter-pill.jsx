/**
 * Renders a clickable label showing and deleting filter fields
 *
 * @module app/form/filter-pill
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement } from "@b9g/crank";

/**
 * Renders a clickable label showing and deleting filter fields
 *
 * @generator
 * @param {object} props The property object
 * @param {string} props.name The input id and name
 * @param {string} props.type The type, or more correctly the field that will be filtered
 * @param {Function} props.callback The callback function to call with the selected value
 * @yields {Element} A clickable label
 */
function* FilterPill({ name, type, callback }) {
  /**
   * Event handler on click
   *
   * @function handleClick
   * @listens click
   */
  const handleClick = async () => {
    callback(name, type);
  };

  this.addEventListener("change", handleClick);

  while (true)
    yield (
      <span class="ba pv1 ph2 ml2 br2 f6 bg-black-10 dim pointer">
        {name}
        &nbsp; &#x2716;
      </span>
    );
}

export default FilterPill;