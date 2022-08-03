/**
 * Fetch components
 *
 * @module app/lib/fetch
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

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
  //console.log('fetching', src);
  return fetch(src)
    .then(async (response) => {
      if (response.status !== 200) {
        throw new Error("Server Error");
      }
      return response.json();
    })
    .then((json) => {
      //console.log("Got this in GET fetch:", json);
      return { error: null, json };
    })
    .catch((error) => {
      console.warn("Got error in GET fetch:", error);
      if (Object.prototype.hasOwnProperty.call(error, "err")) {
        return { error: error.err, json: null };
      }
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

  return fetch(src, opts)
    .then(async (response) => {
      if (response.status !== 200) {
        throw new Error(JSON.stringify(await response.json()));
      }
      //console.log("Got this response in POST fetch", response);
      return response.json();
    })
    .then((json) => {
      //console.log("Got this in POST fetch:", json);
      return { error: null, json };
    })
    .catch((error) => {
      console.log("Got error in POST fetch:", error);
      if (Object.prototype.hasOwnProperty.call(error, "err")) {
        return { error: error.err, json: null };
      }
      return { error, json: null };
    });
};

export { Fetch, PostFetch };
