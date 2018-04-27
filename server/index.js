const config = require('config');
const express = require('express');
const bodyParser = require('body-parser');
const apiRouter = require('./api');

const app = express();

// Middleware
app.use(bodyParser.json())
	.use(bodyParser.urlencoded({
		extended: true
	}))
	.use('/api', apiRouter)
	.use('*', (req, res) => res.redirect('https://docs.terminal.ink/dectalk/'));

console.log('Listening on', config.get('webserver').port);
app.listen(config.get('webserver').port);
