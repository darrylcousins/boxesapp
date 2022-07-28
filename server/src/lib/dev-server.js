/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { resolve } from "path";
/*
 * create and return the development server
 */
export default async ({ app, root }) => {
  return await import("vite").then(({ createServer }) => {
    return createServer({
      root,
      logLevel: "info",
      configFile: resolve(root, "config/vite.js"),
      server: {
        port: process.env.PORT,
        middlewareMode: "ssr",
      },
    })
  });
};

