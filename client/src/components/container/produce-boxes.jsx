/**
 * Router and starting  point of the box app.
 * Renders [crank]{@link https://www.npmjs.com/@bikeshaving/crank} elements
 *
 * @author Darryl Cousins <darryljcousins@gmail.com>
 * @module app/initialize
 * @requires @bikeshaving/crank
 * @listens DOMContentLoaded
 */
import "regenerator-runtime/runtime"; // regeneratorRuntime error
import { createElement, Fragment } from "@b9g/crank";
import { Fetch } from "../fetch";
import BarLoader from "../bar-loader";
import BoxSelect from "../box-select.js";

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
async function* Box ({handle, boxes, selectedProduct, cartBox, boxInCart}) {

  /**
   * The box fetched
   *
   * @member fetchBox
   * @type {objec}
   */
  let fetchBox = null;

  /**
   * The boxes this product is a member of sorted as object with date keys
   *
   * @member fetchBox
   * @type {objec}
   */
  const boxesByDate = {};

  boxes.forEach(el => {
    boxesByDate[el.delivered] = el;
  });

  /**
   * Display loading indicator while fetching data
   *
   * @member loading
   * @type {boolean}
   */
  let loading = true;

  const init = async () => {
    await Fetch(
      `/products/${handle}.js`
    ).then(async ({ error, json }) => {
      if (error) {
        fetchError = error;
      } else {
        fetchBox = json;
        fetchBox.url = `/products/${fetchBox.handle}`;
        loading = false;
        await this.refresh();
      }
    });
  }

  init();

  for await ({handle, boxes} of this) {
    yield (
      <Fragment>
        { (!loading && fetchBox) ? (
          <Fragment>
            <BoxSelect
              selectedProduct={selectedProduct}
              box={fetchBox}
              boxes={boxesByDate}
              dates={boxes.map(box => box.delivered)}
              title={fetchBox.title}
              initialDate={null}
              initialProducts={[]}
              cartBox={cartBox && cartBox.shopify_product_id === fetchBox.id && cartBox}
              boxInCart={boxInCart}
            />
          </Fragment>
        ) : (
          <BarLoader />
        )}
      </Fragment>
    )
  };
};

/**
 * To group the boxes of dates
 *
 * TODO check box-app for cartJson collection to pass down here
 *
 * @function Boxes
 * @param {object} props.selectedProduct el To pass down the addOn product to get to
 * submitCart
 */
function Boxes ({boxes, selectedProduct, cartBox, boxInCart}) {
  console.log(cartBox);
  return (
    Object.entries(boxes).map(([handle, boxes]) => (
      <Box 
        handle={handle}
        boxes={boxes}
        selectedProduct={selectedProduct}
        cartBox={cartBox}
        boxInCart={boxInCart} />
    ))
  )
};

export default Boxes;
