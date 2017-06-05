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

var crypto = require('crypto');
var tmp = require('tmp');
var fs = require('fs');
var exec = require('child_process').exec;
var request = require('request');

var r = require("./db");

// Middleware
app.use(session({
		secret: config.get('session').secret,
		resave: false,
		saveUninitialized: true,
		proxy: true
	}))
	.set('trust proxy', '192.168.0.100')
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
	.get('/list', function (req, res) {
		res.render('lib.html', { user: req.user, url: "/api/list" });
	})
	.get('/api/list', function(req, res) {
		r.table("list").run(r.conn, (err, cursor) => {
			if (err) {
				return res.send(500, {error: err.message});
			} else {
				cursor.toArray((err, result) => {
					if (err) return res.send(500, {error: err.message});
					result = result.map((item)=>{
						item["html"] = "";
						if(item.status == "render") {
							item["html"] += `<div class="alert alert-danger" role="alert"><strong>Fiddlesticks!</strong> This hasn't been rendered yet</div>`
						} else {
							item["html"] += `<audio controls preload="none"><source src="/dec/${item.id}.wav"></source></audio>`
							item["html"] += `<br>`
							item["html"] += `<a class="btn btn-primary" href="/dec/${item.id}.wav" role="button">Download</a>`
						}

						item["html"] += `<button type="button" class="btn btn-primary" onclick="copyText(\`${item.dectalk.replace(/`/g, "\\\`").replace(/"/g, '\\\'')}\`)">Copy</button>`
						if(req.user) {
							if (config.get('admins').includes(`${req.user.login}@${req.user.type}`) || item.author === `${req.user.login}@${req.user.type}`) {
								item["html"] += `<a class="btn btn-primary" href="/edit?id=${item.id}" role="button">Edit</a>`
								item["html"] += `<a class="btn btn-primary" href="/delete?id=${item.id}" role="button">Delete</a>`
							} else {
								item["html"] += `<a class="btn btn-primary disabled" href="#" title="You are not allowed to edit this document" role="button">Edit</a>`
								item["html"] += `<a class="btn btn-primary disabled" href="#" title="You are not allowed to delete this document" role="button">Delete</a>`
							}
						}
						return item;
					})
					res.status(200).send(result);
				})
			}
		});
	})
	.get('/queue', function (req, res) {
		if(!req.user) return res.status(401).render('error.html', { user: req.user, status: 401, message: "You have not logged in yet" });
		if(!config.get('admins').includes(`${req.user.login}@${req.user.type}`)) return res.status(403).render('error.html', { user: req.user, status: 403, message: "You're not allowed to be in these realms!" });

		res.render('lib.html', { user: req.user, url: "/api/queue" });
	})
	.get('/api/queue', function(req, res) {
		if(!req.user) return res.status(401).render('error.html', { user: req.user, status: 401, message: "You have not logged in yet" });
		if(!config.get('admins').includes(`${req.user.login}@${req.user.type}`)) return res.status(403).render('error.html', { user: req.user, status: 403, message: "You're not allowed to be in these realms!" });

		//Generate token to prevent CSRF.
		let csrf = crypto.randomBytes(64).toString('hex');

		//Insert CSRF token into the CSRF token database.
		r.table("csrf")
			.insert({
					id: `${req.user.login}@${req.user.type}`,
					csrf: csrf
				}, {
					conflict: "replace"
				})
			.run(r.conn, (err, result) => {
				if (err) return res.status(500).render('error.html', { user: req.user, status: 500, message: "An error occured with the Rethonk DB server." });

				r.table("queue")
					.run(r.conn, (err, cursor) => {
					if (err) {
						return res.send(500, {error: err.message});
					} else {
						cursor.toArray((err, result) => {
							if (err) return res.send(500, {error: err.message});
							result = result.map((item)=>{
								item["html"] = `<button type="button" class="btn btn-primary" onclick="copyText(\`${item.dectalk.replace(/`/g, "\\\`").replace(/"/g, '\\\'')}\`)">Copy</button>`
								item["html"] += `<a class="btn btn-primary" href="/approve?id=${item.id}&csrf=${csrf}&accept=false" role="button">Reject</a>`
								item["html"] += `<a class="btn btn-primary" href="/approve?id=${item.id}&csrf=${csrf}&accept=true" role="button">Accept</a>`
								return item;
							})
							res.status(200).send(result);
						})
					}
				});
			});


	})
	.get('/approve', function(req, res) {
		if(!req.user) return res.status(401).render('error.html', { user: req.user, status: 401, message: "You have not logged in yet" });
		if(!config.get('admins').includes(`${req.user.login}@${req.user.type}`)) return res.status(403).render('error.html', { user: req.user, status: 403, message: "You're not allowed to be in these realms!" });
		if(!req.query.csrf		|| typeof(req.query.csrf) != "string"	|| req.query.csrf.length < config.get('limits').csrf.min	|| req.query.csrf.length > config.get('limits').csrf.max	) return res.status(400).render('error.html', { user: req.user, status: 400, message: "Invalid CSRF token provided" });
		if(!req.query.id		|| typeof(req.query.id) != "string"		|| req.query.id.length < config.get('limits').author.min	|| req.query.id.length > config.get('limits').author.max	) return res.status(400).render('error.html', { user: req.user, status: 400, message: "The ID was invalid, or outside the allowed range." });
		if(!req.query.accept	|| typeof(req.query.accept) != "string"	|| !(req.query.accept == "true"								|| req.query.accept == "false" )							) return res.status(400).render('error.html', { user: req.user, status: 400, message: "The Accept/Decline was malformed or not inserted." });

		//Check if the document even exists first
		r.table("queue")
			.get(req.query.id)
			.run(r.conn, (err, result) => {
				if (err) return res.status(500).render('error.html', { user: req.user, status: 500, message: "An error occured with the Rethonk DB server." });
				if(!result) return res.status(404).render('error.html', { user: req.user, status: 404, message: "This document does not exist" });

				let input = {
					artist: result.artist,
					author: result.author,
					dectalk: result.dectalk,
					name: result.name,
					status: "render"
				};

				let id = result.id;

				r.table("csrf")
					.get(`${req.user.login}@${req.user.type}`)
					.run(r.conn, (err, result) => {
						if (err) return res.status(500).render('error.html', { user: req.user, status: 500, message: "An error occured with the Rethonk DB server." });
						if (!result.csrf || !req.query.csrf || result.csrf != req.query.csrf) return res.status(400).render('error.html', { user: req.user, status: 400, message: "Invalid CSRF token provided" });

						let data = {
							url: config.get('discord').webhook,
							method: "POST",
							json: true,
							headers: {
								"User-Agent": config.get('useragent')
							},
							body: {
								username: "DECtalk Online"
							}
						}

						if (req.query.accept == "true") {
							r.table("list")
								.insert(input)
								.run(r.conn, (err, result) => {
									if (err) return res.status(500).render('error.html', { user: req.user, status: 500, message: "An error occured with the Rethonk DB server." });
								});
							data.body.content = `**Accepted** DECtalk titled: \`${input.name.replace(/`/g, "\`")}\` by \`${input.author.replace(/`/g, "\`")}\``;
						} else {
							data.body.content = `**Declined** DECtalk titled: \`${input.name.replace(/`/g, "\`")}\` by \`${input.author.replace(/`/g, "\`")}\``;
						}

						request.post(data);

						//Delete it afterwards
						r.table("queue")
							.get(id)
							.delete()
							.run(r.conn, (err, result) => {
								if (err) return res.status(500).render('error.html', { user: req.user, status: 500, message: "An error occured with the Rethonk DB server." });
								return res.render('success.html', { user: req.user })
							});
					});
			});
	})
	.get('/delete', function(req, res) {
		if(!req.user) return res.status(401).render('error.html', { user: req.user, status: 401, message: "You have not logged in yet" });

		//Generate token to prevent CSRF.
		let csrf = crypto.randomBytes(64).toString('hex');

		//Insert CSRF token into the CSRF token database.
		r.table("csrf")
			.insert({
					id: `${req.user.login}@${req.user.type}`,
					csrf: csrf
				}, {
					conflict: "replace"
				})
			.run(r.conn, (err, result) => {
				if (err) return res.status(500).render('error.html', { user: req.user, status: 500, message: "An error occured with the Rethonk DB server." });

				r.table("list")
					.get(req.query.id)
					.run(r.conn, (err, result) => {
						if (err) {
							res.status(500);
							return res.render('error.html', { user: req.user, status: 500, message: "An error occured with the Rethonk DB server." });
						}

						if(!result) return res.status(404).render('error.html', { user: req.user, status: 404, message: "This document does not exist." });
						if(!(config.get('admins').includes(`${req.user.login}@${req.user.type}`) || (result.author === `${req.user.login}@${req.user.type}`))) return res.status(403).render('error.html', { user: req.user, status: 403, message: "You're not allowed to be in these realms!" });

						res.render('delete.html', { user: req.user, form: result, csrf: csrf });
					});

			});

	})
	.post('/delete', function(req, res) {
		if(!req.user) return res.status(401).render('error.html', { user: req.user, status: 401, message: "You have not logged in yet" });
		if(!req.body.csrf	|| typeof(req.body.csrf) != "string"	|| req.body.csrf.length < config.get('limits').csrf.min	|| req.body.csrf.length > config.get('limits').csrf.max	) return res.status(400).render('error.html', { user: req.user, status: 400, message: "Invalid CSRF token provided" });
		if(!req.body.id		|| typeof(req.body.id) != "string"		|| req.body.id.length < config.get('limits').author.min	|| req.body.id.length > config.get('limits').author.max	) return res.status(400).render('error.html', { user: req.user, status: 400, message: "The ID was invalid, or outside the allowed range." });

		r.table("csrf")
			.get(`${req.user.login}@${req.user.type}`)
			.run(r.conn, (err, result) => {
				if (err) return res.status(500).render('error.html', { user: req.user, status: 500, message: "An error occured with the Rethonk DB server." });
				if (!result.csrf || !req.body.csrf || result.csrf != req.body.csrf) return res.status(400).render('error.html', { user: req.user, status: 400, message: "Invalid CSRF token provided" });

				//Check if the document even exists first
				r.table("list")
					.get(req.body.id)
					.run(r.conn, (err, result) => {
						if (err) return res.status(500).render('error.html', { user: req.user, status: 500, message: "An error occured with the Rethonk DB server." });
						if(!result) return res.status(404).render('error.html', { user: req.user, status: 404, message: "This document does not exist" });
						if(!(config.get('admins').includes(`${req.user.login}@${req.user.type}`) || (result && result.author === `${req.user.login}@${req.user.type}`))) return res.status(403).render('error.html', { user: req.user, status: 403, message: "You're not allowed to delete this document." });


						//Delete it
						r.table("list")
							.get(req.body.id)
							.delete()
							.run(r.conn, (err, result) => {
								if (err) return res.status(500).render('error.html', { user: req.user, status: 500, message: "An error occured with the Rethonk DB server." });
								return res.render('success.html', { user: req.user })
							});
					});
			});
	})
	.get('/edit', function(req, res) {
		if(!req.user) return res.status(401).render('error.html', { user: req.user, status: 401, message: "You have not logged in yet" });

		//Generate token to prevent CSRF.
		let csrf = crypto.randomBytes(64).toString('hex');

		//Insert CSRF token into the CSRF token database.
		r.table("csrf")
			.insert({
					id: `${req.user.login}@${req.user.type}`,
					csrf: csrf
				}, {
					conflict: "replace"
				})
			.run(r.conn, (err, result) => {
				if (err) return res.status(500).render('error.html', { user: req.user, status: 500, message: "An error occured with the Rethonk DB server." });

				if (!req.query.id) return res.status(200).render('edit.html', { user: req.user, csrf: csrf });

				r.table("list")
					.get(req.query.id)
					.run(r.conn, (err, result) => {
						if (err) {
							res.status(500);
							return res.render('error.html', { user: req.user, status: 500, message: "An error occured with the Rethonk DB server." });
						}

						if(!result) return res.status(404).render('error.html', { user: req.user, status: 404, message: "This document does not exist." });
						if(!(config.get('admins').includes(`${req.user.login}@${req.user.type}`) || (result.author === `${req.user.login}@${req.user.type}`))) return res.status(403).render('error.html', { user: req.user, status: 403, message: "You're not allowed to be in these realms!" });

						res.render('edit.html', { user: req.user, form: result, csrf: csrf });
					});

			});

	})
	.post('/edit', function(req, res) {
		if(!req.user) return res.status(401).render('error.html', { user: req.user, status: 401, message: "You have not logged in yet" });
		if(!req.body.id) return res.status(400).render('error.html', { user: req.user, status: 400, message: "An ID was not provided" });

		//Check if there's any invalid crap
		if(!req.body.id			|| typeof(req.body.id) != "string"		|| req.body.id.length < config.get('limits').id.min				|| req.body.id.length > config.get('limits').id.max				) return res.status(400).render('error.html', { user: req.user, status: 400, message: "The ID was invalid, or outside the allowed range." });
		if(!req.body.name		|| typeof(req.body.name) != "string"	|| req.body.name.length < 	config.get('limits').name.min		|| req.body.name.length > config.get('limits').name.max			) return res.status(400).render('error.html', { user: req.user, status: 400, message: "The name was invalid, or outside the allowed range." });
		if(!(config.get('admins').includes(`${req.user.login}@${req.user.type}`)) && (!req.body.author || typeof(req.body.author) != "string" || req.body.author != `${req.user.login}@${req.user.type}` )) return res.status(400).render('error.html', { user: req.user, status: 400, message: "Only admins are allowed to change this value." });
		if(						   typeof(req.body.artist) != "string"																	|| req.body.artist.length > config.get('limits').artist.max		) return res.status(400).render('error.html', { user: req.user, status: 400, message: "The artist was invalid, or outside the allowed range." });
		if(!req.body.dectalk	|| typeof(req.body.dectalk) != "string"	|| req.body.dectalk.length < config.get('limits').dectalk.min	|| req.body.dectalk.length > config.get('limits').dectalk.max	) return res.status(400).render('error.html', { user: req.user, status: 400, message: "The dectalk was invalid, or outside the allowed range." });
		if(!req.body.csrf		|| typeof(req.body.csrf) != "string"	|| req.body.csrf.length < config.get('limits').csrf.min			|| req.body.csrf.length > config.get('limits').csrf.max			) return res.status(400).render('error.html', { user: req.user, status: 400, message: "Invalid CSRF token provided" });

		//Check if the document is owned by the person who is editing right now.
		r.table("list")
			.get(req.body.id)
			.run(r.conn, (err, result) => {
				if (err) return res.status(500).render('error.html', { user: req.user, status: 500, message: "An error occured with the Rethonk DB server." });
				if(!result) return res.status(404).render('error.html', { user: req.user, status: 404, message: "This document does not exist" });
				if(!(config.get('admins').includes(`${req.user.login}@${req.user.type}`) || (result && result.author === `${req.user.login}@${req.user.type}`))) return res.status(403).render('error.html', { user: req.user, status: 403, message: "You're not allowed to edit this document." });

				r.table("csrf")
					.get(`${req.user.login}@${req.user.type}`)
					.run(r.conn, (err, result) => {
						if (err) return res.status(500).render('error.html', { user: req.user, status: 500, message: "An error occured with the Rethonk DB server." });

						if (!result.csrf || !req.body.csrf || result.csrf != req.body.csrf) return res.status(400).render('error.html', { user: req.user, status: 400, message: "Invalid CSRF token provided" });

						let input = {
							id: req.body.id,
							name: req.body.name,
							author: req.body.author,
							artist: req.body.artist,
							dectalk: req.body.dectalk,
							status: "queue"
						}

						r.table("list")
							.get(req.body.id)
							.update(input)
							.run(r.conn, (err, result) => {
								if (err) return res.status(500).render('error.html', { user: req.user, status: 500, message: "An error occured with the Rethonk DB server." });

								return res.render('success.html', { user: req.user })
							});
					});
			});
	})
	.get('/add', function(req, res) {
		if(!req.user) return res.status(401).render('error.html', { user: req.user, status: 401, message: "You have not logged in yet" });

		let csrf = crypto.randomBytes(64).toString('hex');

		//Insert CSRF token into the CSRF token database.
		r.table("csrf")
			.insert({
					id: `${req.user.login}@${req.user.type}`,
					csrf: csrf
				}, {
					conflict: "replace"
				})
			.run(r.conn, (err) => {
				if (err) return res.status(500).render('error.html', { user: req.user, status: 500, message: "An error occured with the Rethonk DB server." });

				let form = {
					disabled: config.get('admins').includes(`${req.user.login}@${req.user.type}`) ? null : "disabled",
					author: `${req.user.login}@${req.user.type}`
				}
				res.render('add.html', { user: req.user, csrf: csrf, form: form })
			});
	})
	.post('/add', function(req, res) {
		if(!req.user) return res.status(401).render('error.html', { user: req.user, status: 401, message: "You have not logged in yet" });

		//Check if there's any invalid crap
		if(!req.body.name		|| typeof(req.body.name) != "string"	|| req.body.name.length < 	config.get('limits').name.min		|| req.body.name.length > config.get('limits').name.max			) return res.status(400).render('error.html', { user: req.user, status: 400, message: "The name was invalid, or outside the allowed range." });
		if(						   typeof(req.body.artist) != "string"																	|| req.body.artist.length > config.get('limits').artist.max		) return res.status(400).render('error.html', { user: req.user, status: 400, message: "The artist was invalid, or outside the allowed range." });
		if(!(config.get('admins').includes(`${req.user.login}@${req.user.type}`)) && (!req.body.author || typeof(req.body.author) != "string" || req.body.author != `${req.user.login}@${req.user.type}` )) return res.status(400).render('error.html', { user: req.user, status: 400, message: "Only admins are allowed to change this value." });
		if(!req.body.dectalk	|| typeof(req.body.dectalk) != "string"	|| req.body.dectalk.length < config.get('limits').dectalk.min	|| req.body.dectalk.length > config.get('limits').dectalk.max	) return res.status(400).render('error.html', { user: req.user, status: 400, message: "The dectalk was invalid, or outside the allowed range." });
		if(!req.body.csrf		|| typeof(req.body.csrf) != "string"	|| req.body.csrf.length < config.get('limits').csrf.min			|| req.body.csrf.length > config.get('limits').csrf.max			) return res.status(400).render('error.html', { user: req.user, status: 400, message: "Invalid CSRF token provided" });

		r.table("csrf")
			.get(`${req.user.login}@${req.user.type}`)
			.run(r.conn, (err, result) => {
				if (err) return res.status(500).render('error.html', { user: req.user, status: 500, message: "An error occured with the Rethonk DB server." });

				if (!result.csrf || !req.body.csrf || result.csrf != req.body.csrf) return res.status(400).render('error.html', { user: req.user, status: 400, message: "Invalid CSRF token provided" });

				let input = {
					name: req.body.name,
					author: `${req.user.login}@${req.user.type}`,
					artist: req.body.artist,
					dectalk: req.body.dectalk
				}

				r.table("queue")
					.insert(input, {
						conflict: "replace"
					})
					.run(r.conn, (err, result) => {
						if (err) return res.status(500).render('error.html', { user: req.user, status: 500, message: "An error occured with the Rethonk DB server." });
						return res.render('success.html', { user: req.user })
					});
			});
	})
	.use('/api/gen', function(req, res) {
		let input = req.body.dectalk || req.query.dectalk;
		if(!input || typeof(input) != "string" || input.length > config.get('limits').dectalk.max ) return res.status(400).render('error.html', { user: req.user, status: 400, message: "The dectalk was invalid, or outside the allowed range." });

		//Make a temp file to store the file
		tmp.file((err, path, fd, clean) => {
			//Write the message to the temp file
			fs.writeFile(path, `[:phone on]${input}`, (error) => {
				if (error) return res.status(500).render('error.html', { user: req.user, status: 500, message: "An error occured while writing your file to a temporary file." });
				//Grab the file, and overwrite it with the wav file.
				exec(`type ${path} | say -w ${path}`, (error) => {
					if (error) return res.status(500).render('error.html', { user: req.user, status: 500, message: "An error occured while executing the program." });

					let audio = fs.createReadStream(path);

					audio.on('open', () => {
						res.set('Content-Type', 'audio/wav');
						res.attachment('output.wav');
						audio.pipe(res);
					});

					//There was an error, so spit it out
					audio.on('error', function(err) {
						res.end(err);
					});
				});
			});
		});
	})
	.get('/api/render', function(req, res) {
		if(!req.user) return res.status(401).render('error.html', { user: req.user, status: 401, message: "You have not logged in yet" });
		if(!config.get('admins').includes(`${req.user.login}@${req.user.type}`)) return res.status(403).render('error.html', { user: req.user, status: 403, message: "You're not allowed to be in these realms!" });

		r.table("list")
			.run(r.conn, (err, cursor) => {
				if (err) return res.send(500, {error: err.message});

					cursor.toArray((err, result) => {
						if (err) return res.send(500, {error: err.message});
						res.render('success.html', { user: req.user });

						result.filter((elem) => {
							return elem.status == "render";
						}).forEach((elem, i)=>{
							setTimeout(()=>{
								//Make a temp file to store the file
								tmp.file((err, path, fd, clean) => {
									if (err) throw err;

									//Write the message to the temp file
									fs.writeFile(path, "[:phone on]" + elem.dectalk, (err) => {
										if (err) throw err;

										//Grab the file, and write it into the dec folder
										exec(`type ${path} | say -w client\\dec\\${elem.id}.wav`, (err) => {
											if (err) throw err;

											r.table("list")
												.get(elem.id)
												.update({status: null});
										});
									});
								});
							}, i*200);
						});
					});
			});
	})
	.use(express.static(__dirname + '/../client'))
	.use('*', function (req, res) {
		return res.status(404).render('error.html', { user: req.user, status: 404 });
	});

console.log("Listening on", config.get('ports').http)
app.listen(config.get('ports').http);

function escapeHTML(unsafe) {
	return unsafe
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}
