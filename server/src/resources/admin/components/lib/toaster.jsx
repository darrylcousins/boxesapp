/**
 * Simple toast to notify user
 *
 * @module app/lib/toast
 */
import { createElement } from "@b9g/crank";
import { renderer } from "@b9g/crank/dom";

const hideOptions = {
  delay: 0,
  duration: 400,
  easing: "ease",
  fill: "both",
};
/**
 * close them all
 */
const closeToasts = () => {
  const existing = document.querySelectorAll("div.toast");
  existing.forEach(el => {
    const hide = el.animate({opacity: 0}, hideOptions);
    el.addEventListener("finish", async () => {
      document.removeChild(el);
    });
  });
};

/**
 * close button
 */
const closeButton = () => {
  const outer = document.createElement("div");
  outer.addEventListener("click", closeToasts);
  outer.classList.add("pl3", "pointer", "tr", "b", "flex-auto");
  const inner = document.createElement("span");
  inner.innerHTML = "𐄂";
  inner.classList.add("b");
  outer.appendChild(inner);
  return outer;
};
/**
 * @function Toaster
 * @param ev {object} The event object with ev.detail
 * @listens all sorts
 */
export default async (ev) => {
  const notice = document.createElement("div");
  const text = document.createElement("div");
  text.classList.add("flex-auto");
  text.style.fontSize = "larger";
  text.textContent = ev.detail.notice;
  notice.appendChild(text);
  notice.appendChild(closeButton());
  const { bgColour, borderColour } = ev.detail;
  let noticeY = 0;
  const existing = document.querySelectorAll("div.toast");
  // adjust position to stack multiple toasts
  existing.forEach(el => {
    noticeY += el.offsetHeight + 5;
  });
  notice.classList.add(
    "z-max",
    "w-50",
    "mv1",
    "br3",
    "ba",
    `b--${borderColour}`,
    "pa3",
    "toast",
    "flex",
    "absolute",
    "b",
    "white",
    "o-70",
    `bg-${bgColour}`);
  const content = document.querySelector("#app");
  const contentTop = content.getBoundingClientRect().top;
  //const screenBottom = window.innerHeight - contentTop + 100;
  const screenBottom = window.innerHeight - 50 + window.scrollY;
  content.appendChild(notice);
  notice.style.right = "4rem";
  notice.style.top = `${screenBottom}px`;
  //const targetY = 50 + noticeY;
  const targetY = screenBottom - 200 + noticeY;
  const animate = notice.animate({ top: `${targetY}px` }, {
      duration: 800,
      easing: "ease",
      fill: "both",
    });
  const removeOptions = { ...hideOptions };
  removeOptions.delay = 2000;
  animate.addEventListener("finish", async () => {
    const hide = notice.animate({opacity: 0}, removeOptions);
    hide.addEventListener("finish", async () => {
      content.removeChild(notice);
    });
  });
  ev.stopPropagation(); // prevent other listeners catching the toast
};

