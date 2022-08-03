/**
 * TextButton module
 *
 * @module app/lib/text-button
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement } from "@b9g/crank";

/**
 * TextButton component using a html `button` tag.
 *
 * @returns {Element} DOM component as `svg` wrapper
 * @param {object} props  Component properties
 * @param {string} props.color Text colour (background transparent)
 * @param {string} props.title Button title (hover hint)
 * @param {string} props.name Button name attribute
 * @param {string} props.action Button `onclick` attribute
 */
const TextButton = (props) => {
  const { color, name, title, action } = props;
  return (
    <button
      class={`f6 fw6 ttu tracked ${color} b--${color} ba ba1 bg-transparent br2 ph2 pv1 dim pointer`}
      onClick={action}
      title={title}
      name={name}
      type="button"
    >
      {title}
    </button>
  );
  /*
  return (
    <button
      class={`w-100 f6 ${type} outline-0 dark-gray b--gray ${borders} bg-transparent pointer pa0`}
      title={text}
      name={slug}
      id={slug}
      type="button"
      >
        <div
          name={name}
          class="dim bg-animate hover-bg-near-white pa1"
          data-item={item}
          data-title={text}
        >
          { text }
        </div>
      </button>
  );
  */
};

export default TextButton;