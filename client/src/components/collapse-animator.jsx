/**
 * Wrap a component to response to signal to animate collapse
 *
 * @module app/components/collapse-animator
 * @exports CollapseAnimator
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement } from "@b9g/crank";

/**
 * Wrap a crank Component and animate collapse
 *
 * @function AnimateCollapseWrapper
 * @returns {Function} Return the wrapped component
 * @param {object} Component The component to be wrapped
 * @param {object} options Options for form and modal
 */
function CollapseWrapper(Component) {

  /*
   * Animated block to zero height
   *
   * @function collapseElement
   * from https://css-tricks.com/using-css-transitions-auto-dimensions/
   *
   */
  const collapseElement = (element) => {
    if (!element) return;
    let elementHeight = 1;
    element.childNodes.forEach(el => {
      elementHeight += el.scrollHeight;
    });
    var elementTransition = element.style.transition;
    element.style.transition = "";
    requestAnimationFrame(() => {
      element.style.height = elementHeight + "px";
      element.style.transition = elementTransition;
      requestAnimationFrame(() => {
        element.style.height = 0 + "px";
      });
    });
  }

  /*
   * Animates height to current rendered height using css transition
   *
   * @function transitionElementHeight
   * from https://css-tricks.com/using-css-transitions-auto-dimensions/
   * .collapsible {
   *   overflow:hidden;
   *   transition: height 0.8s ease-out;
   *   height:auto;
   * }
   *
   * Important to check and clear floats in child elements
   */
  const transitionElementHeight = (element) => {
    if (!element) return;
    // simply using el.scrollHeight can give some odd results when element is shrinking
    let calculatedHeight = 1;
    let tempEl = element;
    // drop into the first element to solve sizing on IOS
    if (element.childNodes.length === 1) {
      tempEl = element.childNodes[0];
    };
    tempEl.childNodes.forEach(el => {
      if (el.getAttribute("name") === "hasChildren") {
        el.childNodes.forEach(child => {
          calculatedHeight += child.offsetHeight;
        });
      } else {
        calculatedHeight += el.offsetHeight;
      };
    });
    calculatedHeight += 10;
    element.style.height = `${calculatedHeight}px`;
  }
  
  /*
   * @function sleepUntil
   * Wait for element to be rendered
   * From https://levelup.gitconnected.com/javascript-wait-until-something-happens-or-timeout-82636839ea93
   *
   */
  async function sleepUntil(f, timeoutMs) {
    return new Promise((resolve, reject) => {
      let timeWas = new Date();
      let wait = setInterval(function() {
        if (f()) {
          clearInterval(wait);
          resolve();
        } else if (new Date() - timeWas > timeoutMs) { // Timeout
          clearInterval(wait);
          reject();
        }
        }, 20);
      });
  }

  /**
   * Wrap a crank Component and provide animation functionality
   *
   * @function Wrapper
   * @yields {Element} Return the wrapped component
   * @param {object} props Property object
   */
  return async function* ({id, collapsed, ...props}) {

    const fixCollapse = () => {
      const el= document.querySelector(`#${id}`);
      transitionElementHeight(el);
    };

    window.addEventListener('resize', fixCollapse);

    for await (const {id, collapsed: newCollapsed, ...props} of this) {

      const startCollapsed = (collapsed === newCollapsed) && collapsed;
      const el = yield (
        <div
          id={id}
          class={`collapsible ${startCollapsed ? "collapsed" : ""}`}
        >
          <Component
            {...props}
          />
        </div>
      );

      // wait until the element has rendered
      // if not yet rendered, ignore
      if (el !== 'undefined') {
        await sleepUntil(() => document.querySelector(`#${el.id}`), 1000);
      };

      const element = document.querySelector(`#${el.id}`);
      //console.log(`${el.id} ${element.style.height}`);
      if (element) {
        //console.log(id, "old", collapsed, "new", newCollapsed, "start", startCollapsed);
        if (newCollapsed) {
          collapseElement(element);
        } else {
          transitionElementHeight(element);
        }
        //element.scrollIntoView({ behavior: "smooth" });
      }

      collapsed = newCollapsed;

    }
  };
}

export default CollapseWrapper;
