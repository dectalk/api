const config = require('config');
const express = require('express');
const bodyParser = require('body-parser');
const apiRouter = require('./api');
const fs = require('fs');
const { exec } = require('child_process');

const app = express();

// Middleware
app.use(bodyParser.json())
	.use(bodyParser.urlencoded({
		extended: true
	}))
	.use('/api', apiRouter)
	.use('*', (req, res) => res.redirect('https://github.com/7coil/dectalk-webserver/wiki'));

// Remove old socket
if (typeof config.get('webserver').port !== 'number') {
	fs.unlinkSync(config.get('webserver').port, (err) => { if (err) console.error(err); });
}

// Create a socket, or listen to a port
console.log('Listening on', config.get('webserver').port);
app.listen(config.get('webserver').port);

// Chown the new socket
if (typeof config.get('webserver').port !== 'number') {
	exec(`chown ${config.get('webserver').sock_owner} ${config.get('webserver').port}`);
}
