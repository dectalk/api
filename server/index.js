const config = require('config');
const express = require('express');
const bodyParser = require('body-parser');
const engines = require('consolidate');
const path = require('path');
const apiRouter = require('./api');

const app = express();

// Middleware
app.set('trust proxy', '192.168.0.100')
	.use(bodyParser.json())
	.use(bodyParser.urlencoded({
		extended: true
	}))
	.set('views', path.join(__dirname, '/dynamic'))
	.engine('html', engines.mustache)
	.set('view engine', 'html')
	.use('/api', apiRouter)
	.get('/', (req, res) => {
		res.render('index.html');
	})
	.get('/list', (req, res) => {
		res.render('list.html');
	})
	.use(express.static(path.join(__dirname, '/static')))
	.use('*', (req, res) => res.status(404).render('error.html', { user: req.user, status: 404 }));

console.log('Listening on', config.get('webserver').port);
app.listen(config.get('webserver').port);
