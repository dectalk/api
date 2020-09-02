const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const childProcess = require('child_process');

const app = express();

// Middleware
app.use(bodyParser.json())
  .use(bodyParser.urlencoded({
    extended: true
  }))
  .use(cors())
  .use('/gen', (req, res, next) => {
    if (req.query.content) {
      const program = childProcess.spawn('say_demo_us', [
        '-a', req.query.content,
        '-fo', '/dev/stdout'
      ])

      program.stdout.pipe(res)
    } else {
      next()
    }
  })
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
  .listen(3000);
