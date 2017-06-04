module.exports = {
	github: {
		clientID: '',
		clientSecret: ''
	},
	discord: {
		clientID: '',
		clientSecret: '',
		scope: [
			'identify'
		]
	},
	url: '127.0.0.1',
	ports: {
		http: 3472
	},
	rethinkdb: {
		host: '',
		port: 28015,
		db: 'dectalk'
	},
	session: {
		secret: 'Insert any RANDOM string into here. Maybe use random.org, /dev/urandom, or cosmic background radiation.'
	}
};
