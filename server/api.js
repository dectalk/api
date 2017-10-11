const express = require('express');
const tmp = require('tmp');
const fs = require('fs');
const r = require('./db');
const exec = require('child_process').exec;

const router = express.Router();

const lister = (req, res, next) => {
	r.table('list').run(r.conn, (err1, cursor) => {
		if (err1) {
			res.status(500).json({ error: err1.message });
		} else {
			cursor.toArray((err2, result) => {
				if (err2) {
					res.status(500).json({ error: err2.message });
				} else {
					res.locals.result = result;
					next();
				}
			});
		}
	});
};

router.use('/gen*', (req, res) => {
	const input = req.body.dectalk || req.query.dectalk;
	if (!input || typeof (input) !== 'string') {
		res.status(400).json({ message: 'The dectalk was invalid.' });
	} else {
		console.log(input);
		// Make a temp file to store the file
		tmp.file((err1, path, fd, clean) => {
		// Write the message to the temp file
			fs.writeFile(path, `[:phone on]${input}`, (err2) => {
				if (err2) {
					res.status(500).json({ message: err2.message });
				} else {
					// Grab the file, and overwrite it with the wav file.
					exec(`type ${path} | say -w ${path}`, (err3) => {
						if (err3) {
							res.status(500).json({ message: err3.message });
						} else {
							const audio = fs.createReadStream(path);

							audio.on('open', () => {
								audio.pipe(res);
							});

							audio.on('end', () => {
								clean();
							});

							// There was an error, so spit it out
							audio.on('error', (err) => {
								res.end(err);
								clean();
							});
						}
					});
				}
			});
		});
	}
})
	.get('/render', (req, res) => {
		r.table('list')
			.run(r.conn, (err1, cursor) => {
				if (err1) {
					res.status(500).json({ message: err1.message });
				} else {
					cursor.toArray((err2, result) => {
						if (err2) {
							res.status(500).json({ message: err2.message });
						} else {
							result.filter(elem => elem.status === false).forEach((elem, i) => {
								setTimeout(() => {
									// Make a temp file to store the file
									tmp.file((err3, path) => {
										if (!err3) {
											// Write the message to the temp file
											fs.writeFile(path, `[:phone on]${elem.dectalk}`, (err4) => {
												if (!err4) {
													// Grab the file, and write it into the dec folder
													exec(`type ${path} | say -w server\\static\\dec\\${elem.id}.wav`, (err5) => {
														if (!err5) {
															console.log('Updated:', elem.id, elem.name);

															r.table('list')
																.get(elem.id)
																.update({ status: true })
																.run(r.conn);
														}
													});
												}
											});
										}
									});
								}, i * 200);
							});
						}
						res.json({ message: 'Success' });
					});
				}
			});
	})
	.get('/list', lister, (req, res) => {
		res.json(res.locals.result);
	})
	.get('/', (req, res) => {
		res.render('api.pug', { user: req.user });
	});

module.exports = router;
