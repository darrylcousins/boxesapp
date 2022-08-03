/**
 * Simple toast to notify user
 *
 * @module app/recharge/toast
 */

import { animationOptions } from "../helpers";
/**
 * I think these are called toasts?
 * @function notifyUser
 * @param ev {object} The event object with ev.detail
 * @listens subscriptionChanged
 */
export const notifyUser = async (ev) => {
  const notice = document.createElement("div");
  notice.textContent = ev.detail.notice;
  const { bgColour, borderColour } = ev.detail;
  let noticeHeight = 0;
  const existing = document.querySelectorAll("div.toast");
  // adjust position to stack multiple toasts
  existing.forEach(el => {
    noticeHeight += el.offsetHeight + 5;
  });
  for (const c of ["toast", "absolute", "white", "o-90", `bg-${bgColour}`, "w-50", "mv1", "br3", "ba", `b--${borderColour}`, "pa2", "f6"]) {
    notice.classList.add(c);
  };
  const content = document.querySelector("#app");
  content.appendChild(notice);
  notice.style.right = "20px";
  notice.style.bottom = "-100px";
  const targetY = `${200 + noticeHeight}px`;
  const noticeOffsetHeight = notice.offsetHeight + 5;
  const animate = notice.animate({ bottom: targetY }, animationOptions);
  const hideOptions = {
    delay: 1500,
    duration: 400,
    easing: "ease",
    fill: "both",
  };
  animate.addEventListener("finish", async () => {
    const second = notice.animate({opacity: 0}, hideOptions);
    second.addEventListener("finish", async () => {
      content.removeChild(notice);
    });
  });
};
