/**
 * Starting point of url route /boxes
 *
 * @module app/route/boxes
 * @exports Boxes
 * @requires module:app/boxes-current
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement } from "@b9g/crank";
import CurrentBoxes from "../box/boxes-current";

/**
 * Route to boxes, linked from navigation
 * **timestamp** allows preload of particular date - see initialize
 *
 * @function
 * @returns {Element} Renders <CurrentBoxes />
 * @example
 * import {renderer} from '@bikeshaving/crank/cjs/dom';
 * renderer.render(<Box />, document.querySelector('#app'))
 */
export default ({ timestamp }) => <CurrentBoxes timestamp={ timestamp }/>;
