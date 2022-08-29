/**
 * Starting point of url route /recharge-cancel-options
 *
 * @module app/route/recharge-cancel-options
 * @exports Logs
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement } from "@b9g/crank";
import CancelOptions from "../recharge/cancel-options";

/**
 * Route to recharge, linked from side menu
 *
 * @function
 * @returns {Element} Renders <CancelOptions />
 * @example
 * import {renderer} from '@bikeshaving/crank/cjs/dom';
 * renderer.render(<CancelOptions />, document.querySelector('#app'))
 */
export default () => <CancelOptions />;



