/**
 * Starting point of url route /orders
 *
 * @module app/route/orders
 * @exports Logs
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement } from "@b9g/crank";
import CurrentOrders from "../order/orders-current";

/**
 * Route to orders, linked from navigation
 *
 * @function
 * @returns {Element} Renders <Settings />
 * @example
 * import {renderer} from '@bikeshaving/crank/cjs/dom';
 * renderer.render(<Box />, document.querySelector('#app'))
 */
export default () => <CurrentOrders />;

