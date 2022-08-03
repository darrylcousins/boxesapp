
export default {
  esbuild: {
    jsxFactory: "createElement",
    jsxFragment: "Fragment"
  },
  server: {
    port: 3330,
  },
  build: {
    rollupOptions: {
      // https://rollupjs.org/guide/en/#big-list-of-options
      input: {
        boxesapp: "main.jsx",
      },
      output: {
        dir: "theme/assets",
        assetFileNames: "[name][extname]",
        entryFileNames: "[name].js"
      }
    }
  },
};

