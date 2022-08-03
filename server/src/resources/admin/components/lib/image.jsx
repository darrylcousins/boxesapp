/**
 * Component
 *
 * @module lib/image
 * @exports {Element} Image
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment } from "@b9g/crank";
import { animateFadeForAction } from "../helpers";

async function *Image({ src, id }) {

  let loading = true;
  let uri = null;

  const getImage = async () => {

    let image = null
    do {
     image = await fetch(src);
    } while (!image);
    uri = image.url;
    loading = false;
    let target;
    target = target ? target : document.querySelector(`#${id}`);
    if (target) {
      animateFadeForAction(target, () => this.refresh());
    } else {
      this.refresh();
    };
  };

  getImage(src);

  for await ({ src, id } of this) { // eslint-disable-line no-unused-vars
    yield (
      <div class="ba dib v-mid" id={ id } style="width: 3em; height: 3em" >
        { loading ? (
          <div class="skeleton mr1 w-100 h-100" style="width: 3em; height: 3em" />
        ) : (
          <div class="cover mr1 w-100 h-100" style={ `background-image: url("${ uri }");` } />
        )}
      </div>
    );
  };
};

export default Image;
