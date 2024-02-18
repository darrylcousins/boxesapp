/**
 * Starting point of url route /settings
 *
 * @module app/route/settings
 * @exports Logs
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement } from "@b9g/crank";
import Settings from "../setting/settings-plus";

/**
 * Route to settings, linked from navigation
 *
 * @function
 * @returns {Element} Renders <Settings />
 * @example
 * import {renderer} from '@bikeshaving/crank/cjs/dom';
 * renderer.render(<Box />, document.querySelector('#app'))
 */
export default () => <Settings />;

