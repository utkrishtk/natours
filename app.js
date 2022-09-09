const path = require('path');
const tourRouter = require(`${__dirname}/routes/tourRoutes`);
const userRouter = require(`${__dirname}/routes/userRoutes`);
const reviewRouter = require(`${__dirname}/routes/reviewRoutes`);
const bookingRouter = require(`${__dirname}/routes/bookingRoutes`);
const viewRouter = require(`${__dirname}/routes/viewRoutes`);
const AppError = require('./utils/AppError');
const globalErrorHandler = require('./controllers/errorController');
const express = require('express');
const morgan = require('morgan');
// Next packages are required to implement security
const rateLimiter = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const compression = require('compression');

// Start express app
const app = express();

app.set('view engine', 'pug');
// app.set('views', path.join(__dirname, 'views'));
//1)Global MIDDLEWARES

//It is to serve the static files
// app.use(express.static(`${__dirname}/public`));
app.use(express.static(path.join(__dirname, 'public')));

//Setting HTTP headers security
app.use(helmet());
app.use(cors({ origin: '*' }));
app.options(cors({ origin: '*' }));

//Request showed in console along with time taken to response
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

//To limit the number of request coming from certain ip
const limiter = rateLimiter({
  max: 100,
  windowMs: 1 * 60 * 60 * 1000,
  message: "It's exceeds its request limit. Please try after an hour",
});
app.use('/api', limiter);

//It's a body parser which only parse the body data to req.body which is less than or equal to 10kb
app.use(express.json({ limit: '10kb' }));
// app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

//Prevent from NoSQL query injection Data sanitization
app.use(mongoSanitize());

//Data sanitization against XSS
app.use(xss());

//Prevent Parameter Pollution
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficult',
      'price',
    ],
  })
);

app.use(compression());

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// 2) ROUTE HANDLER

// app.get('/api/v1/tours', getAllTours);
// app.get('/api/v1/tours/:id', getTour);
// app.post('/api/v1/tours', createTour);
// app.patch('/api/v1/tours/:id', updateTour);
// app.delete('/api/v1/tours/:id', deleteTour);

// 3) ROUTES

app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

app.all('*', (req, res, next) => {
  next(
    new AppError(`We are failed to get ${req.originalUrl} on this server`, 404)
  );
});

app.use(globalErrorHandler); // To create midlleware as error handler middleware we have to pass 4 arguments to it of which first one is error object
module.exports = app;
