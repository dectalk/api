const express = require('express');
const tmp = require('tmp');
const fs = require('fs');
const r = require('./db');
const { spawn, exec } = require('child_process');

const characters = Object.assign(
	require('unicode/category/Cc'),
	require('unicode/category/Zs'),
	require('unicode/category/Po'),
	require('unicode/category/Sc'),
	require('unicode/category/Ps'),
	require('unicode/category/Pe'),
	require('unicode/category/Sm'),
	require('unicode/category/Pd'),
	require('unicode/category/Nd'),
	require('unicode/category/Lu'),
	require('unicode/category/Sk'),
	require('unicode/category/Pc'),
	require('unicode/category/Ll'),
	require('unicode/category/So'),
	require('unicode/category/Lo'),
	require('unicode/category/Pi'),
	require('unicode/category/Cf'),
	require('unicode/category/No'),
	require('unicode/category/Pf'),
	require('unicode/category/Lt'),
	require('unicode/category/Lm'),
	require('unicode/category/Mn'),
	require('unicode/category/Me'),
	require('unicode/category/Mc'),
	require('unicode/category/Nl'),
	require('unicode/category/Zl'),
	require('unicode/category/Zp'),
	require('unicode/category/Cs'),
	require('unicode/category/Co')
);

const convert = string => string.split('').map((char) => {
	if (char.match(/[\u000D\u000A\u0020-\u007F]/)) {
		return char;
	} else if (characters[char.charCodeAt(0)]) {
		return ` ${characters[char.charCodeAt(0)].name} `;
	}
	return ' Non-Unicode Character ';
}).join('');

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
	const input = convert(req.body.dectalk || req.query.dectalk);
	if (!input || typeof (input) !== 'string') {
		res.status(400).json({ message: 'The dectalk was invalid.' });
	} else {
		const dectalk = spawn('say');
		dectalk.stdin.write(input);

		dectalk.stdout.on('data', (data) => {
			res.write(data);
		});

		dectalk.stdout.on('close', () => {
			res.end();
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
