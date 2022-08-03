/**
 * Flash message
 *
 * @module app/flash
 * @exports {Element} Flash
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement } from "@b9g/crank";

/**
 * Flash
 *
 * @returns {Element} DOM component
 */
function* Flash({ children }) {
  /*
  this.addEventListener('webkitAnimationEnd', (ev) => {
    console.log('animation ends', ev.target);
    ev.target.classList.add("o-0");
  });
  */
  for ({children} of this) {
    yield (
      <div 
        class="dn flash ba br2 z-max fixed top-2 right-2 pa3" 
      >
        <div class="tc">
            { children }
        </div>
      </div>
    )
  };
};

export default Flash;

/*
<div 
  class="fade-out flash ba br2 z-max fixed top-2 pa3 dn" 
>
  <div class="tc">
      { children }
  </div>
</div>
*/