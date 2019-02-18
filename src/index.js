const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const config = require('./config.json');

const apiRouter = require('./routes/api');

const app = express();

// Middleware
app.use(bodyParser.json())
  .use(bodyParser.urlencoded({
    extended: true
  }))
  .use(cors())
  .use('/api/gen*', apiRouter)
  .use('/', (req, res) => res.redirect('https://github.com/dectalk'))
  .use((err, req, res, next) => { // eslint-disable-line
    console.log(err);
    res.status(500).sendFile(path.join(__dirname, 'error.wav'), {
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Disposition': 'attachment; filename=error.wav'
      }
    });
  })
  .listen(config[process.platform].webserver.port);
