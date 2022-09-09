const mongoose = require('mongoose');
const dotenv = require('dotenv');

// process.on('uncaughtException', (err) => {
//   console.log(err.name, err.message);
//   console.log('Unhandled exception Shutting down');

//   process.exit(1);
// });
dotenv.config({ path: './config.env' });

const app = require(`${__dirname}/app.js`);

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);
mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('DB connection successful!');
  });

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`App running on port ${port}....`);
});

//This is to handle rejected promise like rejected connecting mongodb server
process.on('unhandledRejection', (err) => {
  console.log(err.name, err.message);
  console.log('Unhandled Rejection  Shutting down');
  server.close(() => {
    process.exit(1);
  }); // By server.close it will shut down server get shut down gracefully
});

// This is to handle uncaught exception
