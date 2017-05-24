const express = require('express');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const apiRouter = require('./routes/apiRouter');
const app = express();
const { DATABASE_URL, PORT } = require('./config');
const mongoose = require('mongoose');

//use global promise instead of mongoose's
mongoose.Promise = global.Promise;

app.use(morgan('common'));
app.use(bodyParser.json());

app.use('/api', apiRouter);

let server;
function runServer(databaseUrl = DATABASE_URL, port = PORT) {
  return new Promise((resolve, reject) => {
    mongoose.connect(databaseUrl, err => {
      if (err) {
        return reject(err);
      }
      server = app.listen(port, () => {
        console.log(`Your app is listening on port ${port}`);
        resolve(server);
      })
        .on('error', err => {
          mongoose.disconnect();
          reject(err);
        });
    });
  })
} 

function closeServer() {
  return mongoose.disconnect().then(() => {
    return new Promise((resolve, reject) => {
      console.log('Closing server');
      server.close(err => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
  });
}

if (require.main === module) {
  runServer().catch(err => console.error(err));
};

module.exports = {app, runServer, closeServer};