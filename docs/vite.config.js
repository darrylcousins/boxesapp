import { defineConfig } from "vite";
//import { vitePluginMdToHTML } from 'vite-plugin-md-to-html';
import vitePluginMdToHTML from "./src/index.js";

export default defineConfig({
  plugins: [
    vitePluginMdToHTML()
  ],
  server: {
    port: 4000,
  },
})
