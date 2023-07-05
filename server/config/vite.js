//import react from "@vitejs/plugin-react";
//import "dotenv/config";
//
import { fileURLToPath } from "url";
import dotenv from "dotenv";
dotenv.config();

const vendors = ["@b9g/crank"];

const renderChunks = () => {
  let chunks = {};
  for (const key of vendors) {
    chunks[key] = [key];
  };
  return chunks;
};

/**
 * @type {import("vite").UserConfig}
 */
export default {
  // used in App.jsx
  define: {
    PROXY_PATH: JSON.stringify(process.env.PROXY_PATH),
    /*
    SHOP: JSON.stringify(process.env.SHOP),
    "process.env.PROXY_PATH": JSON.stringify(process.env.PROXY_PATH),
    "process.env.SHOP": JSON.stringify(process.env.SHOP),
    "process.env.SHOPIFY_API_KEY": JSON.stringify(process.env.SHOPIFY_API_KEY),
    */
  },
  // make all links to assets absolute urls
  base: `${process.env.HOST}/`,
  esbuild: {
    jsxFactory: "createElement",
    jsxFragment: "Fragment"
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      input: {
        admin: fileURLToPath(new URL("../src/assets/admin.html", import.meta.url)),
        customer: fileURLToPath(new URL("../src/assets/customer.html", import.meta.url)),
      },
      output: {
        manualChunks: {
          vendor: vendors,
        },
      },
    },
  },
  // https://vitejs.dev/config/server-options.html
  // disable cors which injects "*" in development server but I use nginx to so was ending up
  // with error 'access-control-allow-origin' header contains multiple values
  server: {
    cors: false,
  },
};
