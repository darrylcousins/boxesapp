/**
 * Starting point of url route /core-box
 *
 * @module app/route/core-box
 * @exports CoreBox
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement } from "@b9g/crank";
import CoreBox from "../box/box-core";

/**
 * Route to boxes, linked from navigation
 * **timestamp** allows preload of particular date - see initialize
 *
 * @function
 * @returns {Element} Renders <CoreBox />
 */
export default () => <CoreBox />;

