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
		],
		webhook: ""
	},
	reddit: {
		clientID: '',
		clientSecret: ''
	},
	name: 'DECtalk Online',
	url: '127.0.0.1',
	callback: 'http://127.0.0.1:3472/auth/login/callback',
	useragent: 'DECtalk Online (https://talk.moustacheminer.com/)',
	ports: {
		http: 8080
	},
	rethinkdb: {
		host: '',
		port: 28015,
		db: 'dectalk'
	},
	session: {
		secret: 'Add any random string here'
	},
	admins: [
		"190519304972664832@discord"
	],
	limits: {
		id: {
			min: 30,
			max: 40
		},
		name: {
			min: 5,
			max: 140
		},
		author: {
			min: 3,
			max: 140
		},
		artist: {
			min: 3,
			max: 140
		},
		dectalk: {
			min: 5,
			max: 10000
		},
		csrf: {
			min: 127,
			max: 129
		},
		other: {
			min: 0,
			max: 50
		}
	}
};
