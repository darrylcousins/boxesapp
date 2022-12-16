/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import hljs from "highlight.js";
/*
import hljs from "highlight.js/lib/common"; // smaller set of languages
import hljs from "highlight.js/lib/core"; // smallest set
*/
const md = await import("markdown-it").then(
  ({ default: fn }) => fn({
    html: true,
    highlight: function (str, lang) {
      if (lang && hljs.getLanguage(lang)) {
        try {
          return hljs.highlight(str, { language: lang }).value;
        } catch (__) {}
      }
      return ''; // use external default escaping
    }
  })
);

const headings = await import("markdown-it-github-headings").then(
  ({ default: fn }) => fn
);

export default (source) => {

  const html = md.use(headings, {}).render(source);

  return html;
};

