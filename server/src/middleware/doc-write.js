/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

export default function docWrite({ app, vite, path }) {
  return async (req, res, next) => {

    console.log(path);
    console.log(req.path);

    next();
  };
};

