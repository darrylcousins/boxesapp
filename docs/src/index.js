import markdownToHTML from "./markdown.js";

const vitePluginMdToHTML = (pluginOptions) => {
  return {
    name: "vite-md-to-html",
    transform(source, id) {
      if (id.endsWith(".md")) {

        const html = markdownToHTML(source, pluginOptions);
        const code = `
export const html = ${JSON.stringify(html)};
export default html;
        `;

        return { code };
      }
    },
  };
};

export default vitePluginMdToHTML;
