/**
 * Starting point of url route /bulk-pause-subscriptions
 *
 * @module app/route/bulk-pause-subscriptions
 * @exports CoreBox
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement } from "@b9g/crank";
import BulkPauseSubscriptions from "../recharge/bulk-pause-subscriptions";

/**
 * Route to boxes, linked from navigation
 * **timestamp** allows preload of particular date - see initialize
 *
 * @function
 * @returns {Element} Renders <BulkPauseSubscriptions />
 */
export default () => <BulkPauseSubscriptions />;



