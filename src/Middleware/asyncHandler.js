const asyncHandler = (fn) => {

    return (req, res, next) => {
      // If rejected, return error response
        Promise.resolve(fn(req, res, next)).catch((error) => {
        errorResponse(error, req, res, next);
      });
    };
  };
  const errorResponse = (error, req, res, next) => {
    res.status(500).json({ message: error.message });
  };

module.exports = {asyncHandler}
  