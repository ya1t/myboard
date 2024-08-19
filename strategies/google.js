const GoogleStrategy = require('passport-google-oauth20').Strategy;
const conn = require('../db');
const sha = require('sha256');

module.exports = function(passport) {
    passport.use(new GoogleStrategy({
        clientID: "57588888284-c2tegiuj45jm4o2sq5f84mrjcaum8oll.apps.googleusercontent.com",
        clientSecret: "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",
        callbackURL: "/google/callback"
      },
      function(token, tokenSecret, profile, done) {
        console.log(profile);
        
        var authkey = "google" + profile.id;
        var displayName = profile.displayName;
        var authEmail = profile.emails && profile.emails.length > 0 ? profile.emails[0].value : null;
    
        let sql = "select * from account where userid=?";
        let params = [authkey];
        conn.query(sql, params, function(err, result) {
            if (err) return done(err);
    
            if (result.length > 0) {
                return done(null, result[0]);
            } else {
                let insertSql = "insert into account (userid, userpw, usergroup, useremail) values (?, ?, ?, ?)";
                let insertParams = [authkey, sha(authkey), 'google', authEmail];
                conn.query(insertSql, insertParams, function(err, insertResult){
                    if (err) return done(err);
                    
                    return done(null, {
                        userid: authkey,
                        userpw: sha(authkey),
                        usergroup: 'google',
                        useremail: authEmail,
                    });
                });
            }
        });
      }
    ));
    
}