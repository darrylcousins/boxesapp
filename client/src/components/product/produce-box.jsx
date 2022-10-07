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
import { Fetch } from "../lib/fetch";
import BarLoader from "../lib/bar-loader";
import BoxSelect from "./box-select";

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
async function* Box ({handle, boxes, selectedProduct, cartBox, cartAddons, boxInCart, idx}) {

  /**
   * The box fetched
   *
   * @member fetchBox
   * @type {objec}
   */
  let fetchBox = null;

  /**
   * Error on fetch
   *
   * @member fetchError
   * @type {object}
   */
  let fetchError = null;

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


  const isCartBox = () => {
    return cartBox 
      && cartBox.shopify_product_id === fetchBox.id
      && boxes.map(box => box.delivered).includes(cartBox.delivered)
      && cartBox;
  };

  for await ({handle, boxes, idx, cartBox, cartAddons} of this) {
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
              idx={idx}
              initialProducts={[]}
              cartBox={isCartBox()}
              cartAddons={cartAddons}
              boxInCart={boxInCart}
            />
          </Fragment>
        ) : (
          <div class="mv1">
            <BarLoader />
          </div>
        )}
      </Fragment>
    )
  };
};

export default Box;

