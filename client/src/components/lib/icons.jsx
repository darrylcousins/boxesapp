/**
 * Cart Icon
 *
 * @module app/icon-cart
 * @exports {Element} IconCart
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement } from "@b9g/crank";

const Icon = ({ children, styleSize }) => {
  styleSize = styleSize ? styleSize : '1.8em';
  const size = 20;
  return (
    <svg
      width={`${size}px`}
      height={`${size}px`}
      class="dib"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${size + 3} ${size + 5}`}
      fillRule="evenodd"
      clipRule="evenodd"
      strokeLinejoin="round"
      strokeMiterlimit="1.414"
      style={ {
        "width": styleSize,
        "height": styleSize,
        "margin": "0",
        "font-weight": "bold",
        "display": "inline-flex",
        "justify-content": "center",
        "align-items": "center",
        "background": "transparent",
        "border": "0",
        "color": "inherit",
      } }>
      {children}
    </svg>
  );
};

export const IconCart = () => (
  <Icon>
    <path d="M36.5 34.8L33.3 8h-5.9C26.7 3.9 23 .8 18.5.8S10.3 3.9 9.6 8H3.7L.5 34.8c-.2 1.5.4 2.4.9 3 .5.5 1.4 1.2 3.1 1.2h28c1.3 0 2.4-.4 3.1-1.3.7-.7 1-1.8.9-2.9zm-18-30c2.2 0 4.1 1.4 4.7 3.2h-9.5c.7-1.9 2.6-3.2 4.8-3.2zM4.5 35l2.8-23h2.2v3c0 1.1.9 2 2 2s2-.9 2-2v-3h10v3c0 1.1.9 2 2 2s2-.9 2-2v-3h2.2l2.8 23h-28z"/>
  </Icon>
);

export const IconPlus = () => (
  <Icon>
    <path d="M1 4.51a.5.5 0 000 1h3.5l.01 3.5a.5.5 0 001-.01V5.5l3.5-.01a.5.5 0 00-.01-1H5.5L5.49.99a.5.5 0 00-1 .01v3.5l-3.5.01H1z" />
  </Icon>
);

export const IconMinus = () => (
  <Icon>
    <path d="M.5 1C.5.7.7.5 1 .5h8a.5.5 0 110 1H1A.5.5 0 01.5 1z" />
  </Icon>
);

