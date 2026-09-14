// Express doesn't catch rejected promises from async route handlers on
// its own — without this, a thrown error in any controller would crash
// the whole server instead of returning a clean 500. Wrap every async
// handler with this instead of repeating try/catch in every controller.
function asyncHandler(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
