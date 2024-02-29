/**
 * Loading indicator module
 *
 * @module app/lib/bar-loader
 * @exports {Element} BarLoader
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement } from "@b9g/crank";

/**
 * Loader component
 *
 * @returns {Element} DOM component
 * @example
 * { loading && <BarLoader /> }
 */
const BarLoader = () => (
  <div class="boxesapp-progress-bar">
    <span class="bar">
      <span class="progress" />
    </span>
  </div>
);

export default BarLoader;
