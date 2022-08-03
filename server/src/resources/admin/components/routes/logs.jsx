/**
 * Starting point of url route /logs
 *
 * @module app/route/logs
 * @exports Logs
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement } from "@b9g/crank";
import CurrentLogs from "../log/logs-current";

/**
 * Route to logs, linked from navigation
 *
 * @function
 * @returns {Element} Renders <CurrentLogs />
 * @example
 * import {renderer} from '@bikeshaving/crank/cjs/dom';
 * renderer.render(<Box />, document.querySelector('#app'))
 */
export default () => <CurrentLogs />;

