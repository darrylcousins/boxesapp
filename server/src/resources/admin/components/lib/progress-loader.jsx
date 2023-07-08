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
const ProgressLoader = () => (
  <div id="progress w-100">
    <div id="innerprogress">
      <div id="move"></div>
    </div>
  </div>
);

export default ProgressLoader;

