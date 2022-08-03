/**
 * The product description and image, this is a temporary component while
 * developing
 *
 * @module app/product-description
 * @exports {Element} ProductDescription
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment } from "@b9g/crank";

/**
 * Product description component - for development only
 *
 * @returns {Element} DOM component
 */
const ProductDescription = ({ product, price }) => {
  return (
    <Fragment>
      <h3 class="center">{product.title}</h3>
      <div class="w-100 vh-25 overflow-hidden">
      <img
        src={`https:${product.featured_image}`}
        title={product.title}
        class="br2"
      />
        </div>
      <div class="pa2 dt w-100 mb1">
        <div class="dtc w-third b black">
          <span class="black price-item price-item--regular" data-regular-price>
            ${(price * 0.01).toFixed(2)}
          </span>
        </div>
        <div class="dtc fw3">
          {product.title}
        </div>
        <div class="dtc tr">
          {product.id}
        </div>
      </div>
    </Fragment>
  )
};

export default ProductDescription;

