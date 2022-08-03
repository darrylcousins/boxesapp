/**
 * Starting point of url route /boxes
 *
 * @module app/route/box-rules
 * @exports Boxes
 * @requires module:app/boxes-current
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement } from "@b9g/crank";
import BoxRules from "../box/box-rules";

/**
 * Route to boxes, linked from navigation
 * **timestamp** allows preload of particular date - see initialize
 *
 * @function
 * @returns {Element} Renders <BoxRules />
 */
export default () => <BoxRules />;
