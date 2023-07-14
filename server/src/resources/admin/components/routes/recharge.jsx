/**
 * Starting point of url route /recharge
 *
 * @module app/route/recharge
 * @exports Logs
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement } from "@b9g/crank";
import Customers from "../recharge/customers";

/**
 * Route to recharge, linked from navigation
 *
 * @function
 * @returns {Element} Renders <Recharge />
 * @example
 * import {renderer} from '@bikeshaving/crank/cjs/dom';
 * renderer.render(<Recharge />, document.querySelector('#app'))
 */
export default () => <Customers />;


