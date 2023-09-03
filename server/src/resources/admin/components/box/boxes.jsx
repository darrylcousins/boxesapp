/**
 * Creates element to render array of boxes
 *
 * @module app/components/boxes
 * @requires module:app/components/box~Box
 * @exports Boxes
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement } from "@b9g/crank";
import Box from "./box";

/**
 * Create tabbed page of boxes by date and sets up tables for box details
 *
 * @generator
 * @yields {Element} - a html table display of the boxes
 * @param {object} props Property object
 * @param {Array} props.boxes - The array of boxes to by displayed
 */
function* Boxes({ boxes }) {

  for ({boxes} of this) { // eslint-disable-line no-unused-vars
    yield (
      <div class="mt2">
        <div class="cf">&nbsp;</div>
        <table class="mt2 w-100 center" cellSpacing="0" style="border-collapse: separate;">
          <thead>
            <tr>
              {["Delivery", "Title", "Including", "Extras", ""].map(el => (
                <th class="fw6 bb b--black-30 tl pv3 pr3 bg-white sticky z-99">
                  {el}
                </th>
              ))}
            </tr>
          </thead>
          <tbody class="lh-copy tl" id="boxes-table">
            {boxes.map(
              (box, idx) => (
                <Box index={idx} box={box} />
              )
            )}
          </tbody>
        </table>
      </div>
    );
  };
}

export default Boxes;
