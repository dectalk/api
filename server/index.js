/*jshint node:true */
'use strict';

var config = require('config');
var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var engines = require('consolidate');

var app = express();
var auth = require('./auth');
var authRouter = require('./auth/auth-router');

var r = require("./db");

// Middleware
app.use(session({
		secret: config.get('session').secret,
		resave: false,
		saveUninitialized: true
	}))
	.use(auth.initialize())
	.use(auth.session())
	.use(bodyParser.json())
	.use(bodyParser.urlencoded({
		extended: true
	}));

// Views
app.set('views', __dirname + '/views')
	.engine('html', engines.mustache)
	.set('view engine', 'html');

// Routes
app.use('/auth', authRouter)
	.get('/', function (req, res) {
		res.render('index.html', { user: req.user });
	})
	.get('/lib', function (req, res) {
		res.render('lib.html', { user: req.user });
	})
	.get('/list', function(req, res) {
		r.table("list").run(r.conn, (err, cursor) => {
			if (err) {
				return res.send(500, {error: err.message});
			} else {
				cursor.toArray((err, result) => {
					if (err) return res.send(500, {error: err.message});
					res.send(200, result);
				})
			}
		});
	})
	.get('/edit', function(req, res) {
		let input = parseInt(req.query.input);
		if(!req.user) {
			res.status(401);
			return res.render('error.html', { user: req.user, status: 401, message: "You have not logged in yet" });
		}
		if(!config.get('admins').includes(`${req.user.login}@${req.user.type}`)) {
			res.status(403);
			return res.render('error.html', { user: req.user, status: 403, message: "You're not allowed to be in these realms!" });
		}
		if(!input) {
			return res.render('edit.html', { user: req.user })
		}
		r.table("list")
			.get(input)
			.run(r.conn, (err, result) => {
				if (err) {
					res.status(500);
					return res.render('error.html', { user: req.user, status: 500, message: "An error occured with the Rethonk DB server." });
				}

				return res.render('edit.html', { user: req.user, form: result })
			});
	})
	.post('/edit', function(req, res) {
		if(!req.user) {
			res.status(401);
			return res.render('error.html', { user: req.user, status: 401, message: "You have not logged in yet" });
		}
		if(!config.get('admins').includes(`${req.user.login}@${req.user.type}`)) {
			res.status(403);
			return res.render('error.html', { user: req.user, status: 403, message: "You're not allowed to be in these realms!" });
		}
		if(!req.body.id) {
			res.status(400);
			return res.render('error.html', { user: req.user, status: 400, message: "An ID was not provided" });
		}

		let input = {
			id: req.body.id,
			name: req.body.name,
			author: req.body.author || null,
			artist: req.body.artist || null,
			dectalk: req.body.dectalk
		}

		console.log("Updating:", req.body.id)
		console.dir(input)

		r.table("list")
			.get(req.body.id)
			.replace(input)
			.run(r.conn, (err, result) => {
				if (err) {
					res.status(500);
					return res.render('error.html', { user: req.user, status: 500, message: "An error occured with the Rethonk DB server." });
				}

				console.dir(result);
				return res.render('success.html', { user: req.user })
			});
	})
	.use(express.static(__dirname + '/../client'))
	.use('*', function (req, res) {
		res.status(404);
		res.render('error.html', { user: req.user, status: 404 });
	});


app.listen(config.get('ports').http);
