/**
 * Creates element to render html display of order details
 *
 * @module app/components/order-detail
 * @exports OrderDetail
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment } from "@b9g/crank";
import { capWords } from "../helpers";

/**
 * Create a DOM representation of order properties.
 *
 * @function
 * @returns {Element} DOM element displaying order detail
 * @param {object} props Property object
 * @param {object} props.order The order to be displayed
 */
function OrderDetail({ order }) {
  return (
    <Fragment>
      <h3 class="fw4 tl fg-streamside-maroon mb0">
        <span class="mr3">
          #{order.order_number}
        </span>
        <span>
          {order.name}
        </span>
      </h3>
      <h4 class="dib fg-streamside-maroon mb1">
      {order.variant_name} - {order.delivered}
      </h4>
      <div class="fg-streamside-maroon mb2">
      Created: {order.inserted}
      </div>
      <div class="dn">{ order.inserted }</div>
      <div class="dt dt--fixed">
        <div class="dtc pv2">
          <div>
            <span class="db">{order.address1}</span>
            <span class="db">{order.address2}</span>
            <span class="db">{order.city}</span>
            <span class="db">{order.zip}</span>
            <span class="db">{order.phone}</span>
            <span class="db">{order.contact_email}</span>
          </div>
        </div>
        <div class="dtc pv2">
          <div class="mid-gray fw6 mb2">Source</div>
          <div>
            { (typeof order.source === "string") ? (
              <div>{ order.source }</div>
            ) : (
              <ul class="list pl0 mt0">
                <li>{ capWords(order.source.type.split("_")).join(" ") }</li>
                <li>{ order.source.name }</li>
              </ul>
            )}
          </div>
        </div>
        <div class="dtc pv2">
          <div class="mid-gray fw6 mb2">Shipping</div>
          <div>
            { (typeof order.shipping === "object") ? (
              <ul class="list pl0 mt0">
                <li>{ order.shipping.title }</li>
                <li>{ order.shipping.code && capWords(order.shipping.code.split(" ")).join(" ") }</li>
                <li>{ capWords(order.shipping.source.split(" ")).join(" ") }</li>
                <li>{ order.shipping.price }</li>
              </ul>
            ) : (
              <div>&nbsp;</div>
            )}
          </div>
        </div>
      </div>
      <div>
        <div><span class="b mr2">Order id:</span><span>{ order.shopify_order_id }</span></div>
        <div><span class="b mr2">Customer id:</span><span>{ order.shopify_customer_id }</span></div>
      </div>
      <div class="dt dt--fixed">
        <div class="dtc pv2">
            <div class="mt3 fw6">Delivery note:</div>
            <div class="mt2">{order.note}</div>
        </div>
      </div>
      <div class="dt dt--fixed">
        <div class="dtc pv2">
          <div class="mid-gray fw6 mb2">Includes</div>
          <div>
            {order.including.length === 0 ? (
              <span class="gray db pv1">None</span>
            ) : (
              order.including.map((el) => <span class="gray db">{el}</span>)
            )}
          </div>
        </div>
        <div class="dtc pv2">
          <div class="mid-gray fw6 mb2">Extras</div>
          <div>
            {order.addons.length === 0 ? (
              <span class="gray db">None</span>
            ) : (
              order.addons.map((el) => <span class="gray db">{el}</span>)
            )}
          </div>
        </div>
        <div class="dtc pv2">
          <div class="mid-gray fw6 mb2">Swaps</div>
          <div>
            {order.swaps.length === 0 ? (
              <span class="gray db">None</span>
            ) : (
              order.swaps.map((el) => <span class="gray db">{el}</span>)
            )}
          </div>
        </div>
        <div class="dtc pv2">
          <div class="mid-gray fw6 mb2">Excluding</div>
          <div>
            {order.removed.length === 0 ? (
              <span class="gray db">None</span>
            ) : (
              order.removed.map((el) => <span class="gray db">{el}</span>)
            )}
          </div>
        </div>
      </div>
    </Fragment>
  );
}

export default OrderDetail;
