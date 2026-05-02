const Repository = require("../models/repoModel");
const { AppError } = require("./errorHandler");

function authorizeRepoOwner(paramKey = "id") {
  return async (req, _res, next) => {
    try {
      const repoId = req.params[paramKey];
      const repo = await Repository.findById(repoId).select("owner").lean();

      if (!repo) {
        return next(new AppError("Repository not found.", 404));
      }

      if (repo.owner.toString() !== req.userId) {
        return next(new AppError("You do not have permission to perform this action.", 403));
      }

      req.repo = repo;
      next();
    } catch (err) {
      next(err);
    }
  };
}

function authorizeSelf(paramKey = "id") {
  return (req, _res, next) => {
    if (req.params[paramKey] !== req.userId) {
      return next(new AppError("You can only modify your own resources.", 403));
    }
    next();
  };
}

module.exports = { authorizeRepoOwner, authorizeSelf };
