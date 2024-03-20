import { SourcesHotReload } from "./vite.plugins.js";

export default {
  plugins: [ SourcesHotReload() ],
  esbuild: {
    jsxFactory: 'createElement',
    jsxFragment: 'Fragment'
  },
  /*
  define: {
    staticUrl: process.env.NODE_ENV === "development" ? JSON.stringify("https://boxesapp.nz") : "",
  },
  */
  server: {
    port: 3332,
  },
};

