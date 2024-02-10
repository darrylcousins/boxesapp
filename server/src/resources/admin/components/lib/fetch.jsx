/**
 * Fetch components
 *
 * @module app/lib/fetch
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { hasOwnProp } from "../helpers";

/**
 * Fetch component that attempts to deal reasonably if the fetch fails. Always
 * uses a `GET` request` and expects a `json` response.
 *
 * @returns {Promise} A promise resolving to { error, json }
 * @param {string} src Url to send request
 * @example
 * const src
 * Fetch(src)
 *   .then((result) => {
 *     const { error, json } = result;
 *   })
 */
const Fetch = async (src) => {
  const proxy = localStorage.getItem("proxy-path");
  console.log("Fetching", `${proxy}${src}`);
  let error = null;
  return fetch(`${proxy}${src}`)
    .then(async (response) => {
      let json;
      if (response.status === 500) {
        return { error: "500 Server Error" };
      };
      if (response.status === 404) {
        throw new Error("Not found");
      };
      if (response.status !== 200) {
        throw new Error(JSON.stringify(json, null, 2));
      };
      try {
        json = await response.json();
      } catch (e) {
        throw new Error(`Unable to fetch ${src}`);
      };
      return json;
    })
    .then((json) => {
      // jun 2023
      if (Object.hasOwnProperty.call(json, "error")) {
        error = json.error;
        console.log(src, error);
      };
      return { error, json };
    })
    .catch((e) => {

      try {
        error = JSON.parse(e.message);
      } catch {
        error = e;
      };

      if (hasOwnProp.call(error, "err")) {
        return { error: error.err, json: null };
      };
      if (hasOwnProp.call(error, "error")) {
        return { error: error.error, json: null };
      };
      return { error, json: null };
    });
};

/**
 * PostFetch component that attempts to deal reasonably if the fetch fails. Always
 * uses a `POST` request` and expects a `json` response.
 *
 * @returns {Promise} A promise resolving to { error, json }
 * @param {object} opts Dicitonary of options
 * @param {string} opts.src Url to send request to
 * @param {string} opts.data Data to be sent with request
 * @param {string} opts.headers Headers to send data with, usually `{"Content-Type": "application/json"}` but not when uploading files.
 * @example
 * const src = "api/create-todo";
 * const data = {title: "Fix me"};
 * const headers = { "Content-Type": "application/json" };
 * PostFetch({src, data, headers})
 *   .then((result) => {
 *     const { error, json } = result;
 *   })
 */
const PostFetch = async ({ src, data, headers }) => {
  // use json if according to content-type
  const formdata =
    headers["Content-Type"] === "application/json"
      ? JSON.stringify(data)
      : data;

  const opts = {
    method: "POST",
    body: formdata,
  };

  // add headers if set in arguments - i.e. using none if sending files
  if (headers) opts.headers = headers;

  const proxy = localStorage.getItem("proxy-path");
  console.log("Postfetching", `${proxy}${src}`);
  return fetch(`${proxy}${src}`, opts)
    .then(async (response) => {
      let json;
      if (response.status === 500) {
        return { error: "500 Server Error" };
      };
      try {
        json = await response.json();
      } catch (e) {
        throw new Error(response.statusText);
      };
      if (response.status !== 200) {
        console.error("POSTFETCH", response.status, json);
        if (hasOwnProp.call(json, "error")) {
          throw new Error(json.error);
        };
        throw new Error(JSON.stringify(json, null, 2));
      };
      return json;
    })
    .then((json) => {
      if (hasOwnProp.call(json, "error")) {
        return { formError: json, error: json.error, json: null };
      };
      return { error: null, formError: null, json };
    })
    .catch((error) => {
      console.log("Got error in POST fetch:", error.message);
      if (hasOwnProp.call(error, "err")) {
        return { error: error.err, json: null, formError: null };
      };
      if (hasOwnProp.call(error, "error")) {
        return { error: error.error, json: null, formError: null };
      };
      return { error, json: null, formError: null };
    });
};

export { Fetch, PostFetch };
