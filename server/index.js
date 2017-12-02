const config = require('config');
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const apiRouter = require('./api');
const r = require('./db');
const { exec } = require('child_process');

const app = express();

// Middleware
app.set('trust proxy', '192.168.0.100')
	.use(bodyParser.json())
	.use(bodyParser.urlencoded({
		extended: true
	}))
	.set('views', path.join(__dirname, '/dynamic'))
	.set('view engine', 'pug')
	.use('/api', apiRouter)
	.get('/edit', (req, res) => res.render('edit'))
	.get('/', (req, res) => {
		res.render('index.pug');
	})
	.get('/list', (req, res) => {
		r.table('list').run(r.conn, (err1, cursor) => {
			if (err1) {
				res.status(500).json({ error: err1.message });
			} else {
				cursor.toArray((err2, result) => {
					if (err2) {
						res.status(500).json({ error: err2.message });
					} else {
						res.render('list.pug', {
							dectalk: result
						});
					}
				});
			}
		});
	})
	.use(express.static(path.join(__dirname, '/static')))
	.use('*', (req, res) => res.status(404).render('error.pug', { user: req.user, status: 404 }));

console.log('Listening on', config.get('webserver').port);
app.listen(config.get('webserver').port);

if (process.platform !== 'linux') {
	setInterval(() => {
		console.log('Clearing zombie processes');
		exec('taskkill /IM say.exe /F');
	}, 10000);
}
