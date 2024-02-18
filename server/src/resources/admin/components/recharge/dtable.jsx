/**
 * Creates element to render orphans and date mismatches on verification code
 *
 * @module app/recharge/dtable
 * @requires module:app/recharge/dtable~DTable
 * @exports DTable
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment } from "@b9g/crank";
import BarLoader from "../lib/bar-loader";
import Error from "../lib/error";
import Button from "../lib/button";
import { Fetch, PostFetch } from "../lib/fetch";
import { toastEvent } from "../lib/events";
import Toaster from "../lib/toaster";
import { reloadCustomers } from "./events";
import { weekdays } from "../helpers";

/**
 * Create interface to present to administrator a list of items found in verify subscriptions nightly script
 *
 * The interface presented here allows the administrator to see the entries,
 * take action if required, re-verify, and remove the entry.
 *
 * @generator
 * @yields {Element} - a html list
 * @params items 
 */
const DTable = ({ items, title }) => {

  const dl = {
    "border-style": "solid",
    "border-color": "grey",
    "border-radius": "2px",
    "border-top-left-radius": "3px",
    "border-top-right-radius": "3px",
    "border-width": "3px 1px 1px 1px",
    "padding": "0.5em",
    "margin-top": "0.5em",
    "margin-bottom": "0.5em",
  };

  const dt = {
    "float": "left",
    "clear": "left",
    "width": "250px",
    "text-align": "right",
    "font-weight": "bold",
    "color": "grey",
  };

  const dd = {
    "margin": "0 0 0 260px",
    "padding": "0 0 0.5em 0",
  };

  const li = {
    "list-style": "none",
    "padding": "3px 0; margin: 0",
  };

  return (
    <Fragment>
      <div class="b f3">{ title }</div>
      <ul class="list pv2 mv0">
        { items && items.length > 0 && (
          items.map((thing, idx) => (
            <li style={ li }>
              <dl style={ dl } class="alert-box">
                { thing.message && (
                  <Fragment>
                    <dt style={ dt }>Note</dt>
                    <dd style={ dd }>{ thing.message }</dd>
                  </Fragment>
                )}
                <dt style={ dt }>Product title</dt>
                <dd style={ dd }>{ thing.title }</dd>
                <dt style={ dt }>Subscription ID</dt>
                <dd style={ dd }>{ thing.subscription_id }</dd>
                <dt style={ dt }>Next charge</dt>
                <dd style={ dd }>{ thing.next_charge_scheduled_at }</dd>
                { thing.box_subscription_id && (
                  <Fragment>
                    <dt style={ dt }>Box subscription id</dt>
                    <dd style={ dd }>{ thing.box_subscription_id }</dd>
                  </Fragment>
                )}
                { thing.delivery_at && (
                  <Fragment>
                    <dt style={ dt }>Next delivery</dt>
                    <dd style={ dd }>{ thing.delivery_at }</dd>
                  </Fragment>
                )}
                { thing.cancelled_at && (
                  <Fragment>
                    <dt style={ dt }>Cancelled at</dt>
                    <dd style={ dd }>{ thing.cancelled_at }</dd>
                  </Fragment>
                )}
                { thing.updated_at && (
                  <Fragment>
                    <dt style={ dt }>Subscription last updated</dt>
                    <dd style={ dd }>{ thing.updated_at }</dd>
                  </Fragment>
                )}
                { thing.price && (
                  <Fragment>
                    <dt style={ dt }>Box subscription price</dt>
                    <dd style={ dd }>{ thing.price }</dd>
                  </Fragment>
                )}
                { thing.variant_price && (
                  <Fragment>
                    <dt style={ dt }>Box shopify price</dt>
                    <dd style={ dd }>{ thing.variant_price }</dd>
                  </Fragment>
                )}
                { thing.order_day_of_week && (
                  <Fragment>
                    <dt style={ dt }>Charge day</dt>
                    <dd style={ dd }>{ weekdays[thing.order_day_of_week + 1] }</dd>
                  </Fragment>
                )}
              </dl>
            </li>
          )
        ))}
      </ul>
    </Fragment>
  );
};

export default DTable;
