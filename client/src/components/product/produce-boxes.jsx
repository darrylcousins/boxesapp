/**
 * Router and starting  point of the box app.
 * Renders [crank]{@link https://www.npmjs.com/@bikeshaving/crank} elements
 *
 * @author Darryl Cousins <darryljcousins@gmail.com>
 * @module app/initialize
 * @requires @bikeshaving/crank
 * @listens DOMContentLoaded
 */
import { createElement, Fragment } from "@b9g/crank";
import Box from "./produce-box";

/**
 * Box crank component, used for both vege product page and in box select for index/collection page (?)
 *
 * @generator
 * @param {object} props The property object
 * @param {object} props.handle Shopify product handle
 * @param {object} props.selectedProduct el To pass down the addOn product to get to
 * submitCart
 * @yields {Element} A crank DOM component
 */
function Boxes ({boxList, selectedProduct, cartBox, cartAddons, boxInCart, type}) {

  return (
    Object.entries(boxList).map(([handle, boxes], idx) => (
      <Box 
        handle={handle}
        boxes={boxes}
        idx={ `${type}-${idx}` }
        selectedProduct={selectedProduct}
        cartBox={cartBox}
        cartAddons={cartAddons}
        boxInCart={boxInCart} />
    ))
  )
};

export default Boxes;
