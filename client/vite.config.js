
export default {
  esbuild: {
    jsxFactory: "createElement",
    jsxFragment: "Fragment"
  },
  server: {
    port: 3335,
  },
  build: {
    // minify: false,
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

