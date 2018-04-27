const express = require('express');
const fs = require('fs');
const { exec } = require('child_process');
const crypto = require('crypto');
const config = require('config');

const router = express.Router();

router.use('/gen*', (req, res) => {
	const input = req.body.dectalk || req.query.dectalk || '';
	const textFileName = crypto.randomBytes(32).toString('hex');
	const wavFileName = crypto.randomBytes(32).toString('hex');

	// Write the contents of the text to a file. Prevents command line injection
	fs.writeFileSync(`/tmp/${textFileName}`, `[:phone on]${input}`);

	exec(`cat /tmp/${textFileName} | DISPLAY=:0.0 wine ${config.path} -w /tmp/${wavFileName}`, (error) => {
		if (error) {
			res.status(404).json({
				ok: false,
				message: error.message
			});
		} else {
			res.sendFile(`/tmp/${wavFileName}`, {
				headers: {
					'Content-Type': 'audio/wav',
					'Content-Disposition': 'attachment; filename=dectalk.wav'
				}
			});
		}

		res.on('finish', () => {
			fs.unlinkSync(`/tmp/${textFileName}`, console.error);
			fs.unlinkSync(`/tmp/${wavFileName}`, console.error);
		});
	});
});

module.exports = router;
