/**
 * Starting point of url route /cancel-options
 *
 * @module app/route/cancel-options
 * @exports CoreBox
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement } from "@b9g/crank";
import CancelOptions from "../recharge/cancel-options";

/**
 * Route to boxes, linked from navigation
 * **timestamp** allows preload of particular date - see initialize
 *
 * @function
 * @returns {Element} Renders <CoreBox />
 */
export default () => <CancelOptions />;


