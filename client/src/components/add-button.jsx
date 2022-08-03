/**
 * Add to cart button
 *
 * @author Darryl Cousins <darryljcousins@gmail.com>
 * @module app/addToCartButton
 */
import { createElement } from "@b9g/crank";

export default function () {
  return (
    <button
      type="submit"
      name="add"
      aria-label="Add to cart"
      class="product-form__cart-submit debut-yellow bg-debut-yellow br2"
      data-add-to-cart=""
    >
      <span data-add-to-cart-text="">Add to cart</span>{" "}
      <span class="dn" data-loader="">
        <svg
          aria-hidden="true"
          focusable="false"
          role="presentation"
          class="icon icon-spinner"
          viewbox="0 0 20 20"
        >
          <path
            d="M7.229 1.173a9.25 9.25 0 1 0 11.655 11.412 1.25 1.25 0 1 0-2.4-.698 6.75 6.75 0 1 1-8.506-8.329 1.25 1.25 0 1 0-.75-2.385z"
            fill="#919EAB"
          ></path>
        </svg>
      </span>
    </button>
  );
}