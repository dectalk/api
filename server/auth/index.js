/*jshint node:true */
'use strict';

var config = require('config');
var passport = require('passport');
var GitHubStrategy = require('passport-github').Strategy;
var DiscordStrategy = require('passport-discord').Strategy;
var RedditStrategy = require('passport-reddit').Strategy;
//var TwitterStrategy = require('passport-twitter').Strategy;
var r = require('../db');

passport.serializeUser(function (user, done) {
	return done(null, user.id);
});

passport.deserializeUser(function (id, done) {
	r.table('users')
		.get(id)
		.run(r.conn)
		.then(function (user) {
			done(null, user);
		});
});

var loginCallbackHandler = function (objectMapper, type) {
	return function (accessToken, refreshToken, profile, done) {
		if (accessToken !== null) {
		r.table('users')
			.getAll(profile.username || profile.name || profile.id, { index: 'login' })
			.filter({ type: type })
			.run(r.conn)
			.then(function (cursor) {
				return cursor.toArray()
					.then(function (users) {
						if (users.length > 0) {
							return done(null, users[0]);
						}
						return r.table('users')
							.insert(objectMapper(profile))
							.run(r.conn)
							.then(function (response) {
								return r.table('users')
									.get(response.generated_keys[0])
									.run(r.conn);
							})
							.then(function (newUser) {
								done(null, newUser);
							});
					});
			})
			.catch(function (err) {
				console.log('Error Getting User', err);
			});
		}
	};
};

// Github
passport.use(new GitHubStrategy({
		clientID: config.get('github').clientID,
		clientSecret: config.get('github').clientSecret,
		callbackURL: config.get('callback') + '/github'
	},
	loginCallbackHandler(function (profile) {
		return {
			'login': profile.username,
			'name': profile.displayName || null,
			'avatarUrl': profile._json.avatar_url,
			'type': 'github'
		};
	}, 'github')
));

// DiscordApp
passport.use(new DiscordStrategy({
		clientID: config.get('discord').clientID,
		clientSecret: config.get('discord').clientSecret,
		callbackURL: config.get('callback') + '/discord',
		scope: config.get('discord').scope
    },
	loginCallbackHandler(function (profile) {
		return {
			'login': profile.id,
			'name': `${profile.username}#${profile.discriminator}` || null,
			'avatarUrl': `https://images.discordapp.net/avatars/${profile.id}/${profile.avatar}.png?size=512`,
			'type': 'discord'
		};
	}, 'discord')
));

// Reddit
passport.use(new RedditStrategy({
		clientID: config.get('reddit').clientID,
		clientSecret: config.get('reddit').clientSecret,
		callbackURL: config.get('callback') + '/reddit',
    },
	loginCallbackHandler(function (profile) {
		console.dir(profile);

		return {
			'login': profile.name,
			'name': profile.name,
			'avatarUrl': `https://talk.moustacheminer.com/icon/reddit.png`,
			'type': 'reddit'
		};
	}, 'reddit')
));

passport.checkIfLoggedIn = function (req, res, next) {
	if (req.user) {
		return next();
	}
	res.status(401);
	return res.render('error.html', { user: req.user, status: 401, message: "You have not logged in yet" });
};

module.exports = passport;
