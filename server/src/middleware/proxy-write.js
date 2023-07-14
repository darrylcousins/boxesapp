/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

export default function proxyWrite({ app, vite, template, path }) {
  return async (req, res, next) => {

    try {
      const engine = await import("liquidjs")
        .then(({ Liquid }) => new Liquid({
          root: path,
          extname: ".html",
        }));

      const rendered = await engine.renderFile(template, res.locals);
        
      res
        .status(200)
        .set("Content-Type", "application/liquid")
        .send(rendered);
    } catch(e) {
      console.log(e.message);
      if (vite) vite.ssrFixStacktrace(e);

      next(e);
    };

  };
};
