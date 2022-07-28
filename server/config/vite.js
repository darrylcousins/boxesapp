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
    "process.env.PROXY_PATH": JSON.stringify(process.env.PROXY_PATH),
    "process.env.SHOP": JSON.stringify(process.env.SHOP),
    "process.env.SHOPIFY_API_KEY": JSON.stringify(process.env.SHOPIFY_API_KEY),
  },
  // make all links to assets absolute urls
  base: process.env.HOST,
  esbuild: {
    jsxFactory: "createElement",
    jsxFragment: "Fragment"
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      input: {
        app: fileURLToPath(new URL("../src/assets/index.html", import.meta.url)),
      },
      output: {
        manualChunks: {
          vendor: vendors,
        },
      },
    },
  },
};
