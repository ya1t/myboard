const FacebookStrategy = require("passport-facebook").Strategy;
const conn = require('../db');
const sha = require('sha256');

module.exports = function(passport) {
    passport.use(new FacebookStrategy(
        {
            clientID: "1825640864628905",
            clientSecret: "efa7b5bd434cd81cf3f3d52d1c3a6c2b",
            callbackURL: "/facebook/callback",
            profileFields: ['id', 'displayName', 'emails']
        },
        function (accessToken, refreshToken, profile, done){
            console.log(profile);
            var authkey = "facebook" + profile.id;
            var authName = profile.displayName;
            var authEmail = profile.emails && profile.emails.length > 0 ? profile.emails[0].value : null;
    
            let sql = "select * from account where userid=?";
            let params = [authkey];
            conn.query(sql, params, function(err, result) {
                if (err) return done(err);
        
                if(result.length > 0) {
                    return done(null, result[0]);
                    } else {
                        let insertSql = "insert into account (userid, userpw, usergroup, useremail) values (?, ?, ?, ?)";
                        let insertParams = [authkey, sha(authkey), 'facebook', authEmail];
                        conn.query(insertSql, insertParams, function(err,insertResult){
                            if (err) return done(err);
    
                            return done(null, {
                                userid: authkey,
                                userpw: sha(authkey),
                                usergroup: 'facebook',
                                useremail: authEmail
                            });
                        });
                }
            });
        }
        
    )
    );
    
}