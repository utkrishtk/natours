const AppError = require('../utils/AppError');

const sendErrDev = (err, req, res) => {
  //A> API
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.statusCode).json({
      status: err.status,
      err: err,
      message: err.message,
      stack: err.stack,
    });
  }
  //B> Rendered WEBSITE
  return res
    .status(err.statusCode)
    .render('error', { title: 'Something went wrong!', msg: err.message });
};

const sendErrProd = (err, req, res) => {
  //A>Api
  if (req.originalUrl.startsWith('/api')) {
    if (err.isOperational) {
      //Operational, trusted error send message to client
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    } //Programming error do not leak details of such error

    //1) Logging error for our understanding
    console.error('Error', err);

    //2) Some generic Error
    return res.status(500).json({
      status: 'Error',
      message: 'Something went very wrong!',
    });
  }

  //B> RENDERED WEBSITE
  if (err.isOperational) {
    return res
      .status(err.statusCode)
      .render('error', { title: 'Something went wrong!', msg: err.message });
  }

  //1) Logging error for our understanding
  console.error('Error', err);
  //Programming error do not leak details of such error
  //2) Some generic Error sending to the client in that case
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: 'Please try again later.',
  });
};

//Wrong format error coming from mongoose
const handleCastErrorDB = (err) =>
  new AppError(`Invalid ${err.path}: ${err.value}`, 400);

const handleDuplicateFieldsDB = (err) =>
  new AppError(
    `Duplicate field, ${err.keyValue.name}. Try something different`,
    400
  );
const handleValidationErrorDB = (err) =>
  new AppError(`Invalid Data must type the data as required`, 400);

const handleJWTError = () =>
  new AppError('Invalid token, Please login again!', 401);

const handleExpiredToken = () =>
  new AppError('Your Token Expired, Please login again!', 401);

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err };
    error.message = err.message; //For some reason message field is not error

    if (err.name === 'CastError') {
      error = handleCastErrorDB(err);
    }
    if (err.code === 11000) error = handleDuplicateFieldsDB(err);
    if (err.name === 'ValidationError') error = handleValidationErrorDB(err);
    if (err.name === 'JsonWebTokenError') error = handleJWTError();
    if (err.name === 'TokenExpiredError') error = handleExpiredToken();
    sendErrProd(error, req, res);
  }
};
