/**
 * Selling plan component to render selling plans for box
 *
 * @module app/components/selling-plans
 * @exports {Element} SellingPlan
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment } from "@b9g/crank";
import { selectSellingPlanEvent } from "../lib/events";
import { toPrice } from "../../helpers";

/**
 * SellingPlan
 *
 * @returns {Element} DOM component
 */
function* SellingPlans({ productJson, selectedVariant, selectedSellingPlanId }) {

  const selling_plans = productJson.selling_plan_groups[0].selling_plans;

  //const variant_price = selectedVariant.selling_plan_allocations[0].compare_at_price;
  const variant_price = selectedVariant.price;

  const wrapperStyle = {
    border: "1px solid #ccc",
    "margin-bottom": "3px"
  };
  const lineStyle = {
    display: "flex",
    padding: "10px 5px",
    "justify-content": "space-between",
  };
  const labelStyle = {
    "align-items": "center",
    display: "flex",
    "margin-bottom": "0",
    cursor: "pointer"
  };
  const priceStyle = {
    //"font-weight": "700",
    "font-size": "13px",
    "padding-top": "5px",
    display: "inline-block"
  };

  const Help = () => {
    const showHelp = (e) => {
      document.querySelector("#subHelp").style.display = "block";
      window.addEventListener('click', (e) => {
        document.querySelector("#subHelp").style.display = "none";
      });
    };
    const hideHelp = (e) => {
      document.querySelector("#subHelp").style.display = "none";
    };
    return (
      <div
        style="font-weight: 700; cursor:pointer"
        onmouseover={ showHelp }
        onmouseout={ hideHelp }
      >
      &#63;</div>
    );
  };

  /**
   * Handle mouse up on selected components
   *
   * @function handleMouseUp
   * @param {object} ev The firing event
   * @listens click
   */
  const handleMouseUp = (ev) => {
    let target;
    if (["INPUT", "LABEL", "SPAN"].includes(ev.target.tagName)) {

      if (ev.target.tagName === "INPUT") {
        target = ev.target;
      } else if (ev.target.tagName === "LABEL") {
        target = ev.target.querySelector("input");
      } else if (ev.target.tagName === "SPAN") {
        target = ev.target.parentElement.querySelector("input");
      };

      const value = parseFloat(target.value);
      if (!Number.isNaN(value)) {
        this.dispatchEvent(selectSellingPlanEvent(value));
      } else if (target.value === "subscribe") {
        this.dispatchEvent(selectSellingPlanEvent(selling_plans[0].id));
      } else {
        this.dispatchEvent(selectSellingPlanEvent(null));
      };
    };
  };
  this.addEventListener("mouseup", handleMouseUp);

  for ({productJson, selectedVariant, selectedSellingPlanId} of this) {
    const selling_plan = selling_plans.find(el => el.id === selectedSellingPlanId);
    // XXX This needs to be re-visited TODO look at the array of price_adjustments esp. if more than one
    const price_adjustment = selling_plan ? selling_plan.price_adjustments[0].value : null;
    const discount_price = selectedVariant.selling_plan_allocations[0].per_delivery_price;
    yield (
      <div style={ wrapperStyle }>
        { !selectedVariant.requires_selling_plan && (
          <div>
            <div style={ lineStyle }>
              <label style={ labelStyle }>
                <input 
                  checked={ !selectedSellingPlanId }
                  type="radio"
                  id="one-time"
                  value="One-time purchase"
                  name="purchase_option" />
                One-time purchase
              </label>
              <div>
                <div style="display: none">
                  {toPrice(variant_price)}
                </div>
                <div id="one-time-price" style={ priceStyle } />
              </div>
            </div>
          </div>
        )}
        <div style={ !selectedVariant.requires_selling_plan ? "border-top: 1px solid #ccc" : "" }>
          <div style={ lineStyle }>
            <label style={ labelStyle }>
              <input 
                type="radio"
                id="subscribe"
                value="subscribe"
                checked={ selectedVariant.requires_selling_plan || selling_plan }
                name="purchase_option" />
                Subscri{ selectedVariant.requires_selling_plan ? "ption only" : "be" }.
            </label>
            <div>
              <div style={ priceStyle }>
                { price_adjustment > 0 ? (
                  <Fragment>
                    <span style="color: red; text-decoration: line-through; margin-right: 0.25em">{toPrice(variant_price)}</span>
                    <span>{toPrice(discount_price)}</span>&nbsp;
                  </Fragment>
                ) : (
                  <Fragment>
                    <div style="display: none">
                      {toPrice(variant_price)}
                    </div>
                    <div id="subscription-price" class="dib" />
                  </Fragment>
                )}
              </div>
            </div>
          </div>
          <div style="position: relative; padding: 0 10px 10px 25px; display: flex; justify-content: space-between;">
            <div>
              { selling_plans.map(plan => (
                <div class="mv1">
                  <label style={ labelStyle }>
                    <input 
                      type="radio"
                      id={ plan.id }
                      value={ plan.id }
                      checked={ plan.id === selectedSellingPlanId }
                      name="selling_plan" />
                      <span style="margin-left: 0.5em">{ plan.name }</span>
                      <span style="margin-left: 0.5em">{ plan.price_adjustments[0].value > 0 
                          ? 
                          ` & save ${plan.price_adjustments[0].value}%` 
                          : 
                          "" }</span>.
                  </label>
                </div>
              ))}
            </div>
            <Help />
            <div id="subHelp" 
              class="info">
              <strong>How subscriptions work</strong>
              <br />
              <br />
              Products are delivered on your schedule. Modify or cancel your subscription at anytime.
            </div>
          </div>
        </div>
      </div>
    )
  };
};

export default SellingPlans;
