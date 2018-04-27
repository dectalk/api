const config = require('config');
const express = require('express');
const bodyParser = require('body-parser');
const apiRouter = require('./api');
const fs = require('fs');

const app = express();

// Middleware
app.use(bodyParser.json())
	.use(bodyParser.urlencoded({
		extended: true
	}))
	.use('/api', apiRouter)
	.use('*', (req, res) => res.redirect('https://docs.terminal.ink/dectalk/'));

if (typeof config.get('webserver').port !== 'number') fs.unlink(config.get('webserver').port, console.error);
console.log('Listening on', config.get('webserver').port);
app.listen(config.get('webserver').port);
