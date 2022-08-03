/**
 * The included products component - used in collections et al.
 *
 * @module app/components/container/includedProducts
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment } from "@b9g/crank";
import { getSetting } from "../../helpers";

/**
 * Component to present display of box included products
 * In this application always used with CollapseWrapper
 *
 * @yields {Element} DOM component
 */
function* IncludedProducts({id, includedProducts, dates}) {

  for ({id, includedProducts, dates} of this) {
    yield (
      <div id={`${id}-includedProducts`} class="mb2 o-1">
        { !includedProducts.length ? (
          dates.length ? (
            <div>&nbsp;</div>
          ) : (
            <div>{getSetting("Translation", "no-boxes")}</div>
          )
        ) : (
          <Fragment>
            { includedProducts.map(el => (
              <a
                href={`/products/${el.shopify_handle}`}
                class="pill"
                style={{
                  "color": getSetting("Colour", "included-products-fg"),
                  "background-color": getSetting("Colour", "included-products-bg"),
                  "border-color": getSetting("Colour", "included-products-bg")
                }}
              >
                  { el.shopify_title }
              </a>
            ))}
          </Fragment>
        )}
      </div>
    )
  }
}

export default IncludedProducts;