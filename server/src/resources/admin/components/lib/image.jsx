/**
 * Component
 *
 * @module lib/image
 * @exports {Element} Image
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment } from "@b9g/crank";
import { animateFadeForAction } from "../helpers";

async function *Image({ src, id, size, title }) {

  console.log(id);
  let loading = true;
  let uri = null;
  let width = size ? size : "3em";
  let name = title ? title : "";

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

  for await ({ src, id, size, title } of this) { // eslint-disable-line no-unused-vars
    yield (
      <div class="ba dib v-mid" id={ id } style={ `width: ${width}; height: ${width}` } title={ name } >
        { loading ? (
          <div class="skeleton mr1 w-100 h-100" style={ `width: ${width}; height: ${width}` } />
        ) : (
          <div class="cover mr1 w-100 h-100" style={ `background-image: url("${ uri }");` } />
        )}
      </div>
    );
  };
};

export default Image;
