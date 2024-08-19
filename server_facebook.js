var mysql = require("mysql");
var conn = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "mhnawara",
  database: "myboard",
});

conn.connect();

const express = require('express');
const app = express();

const sha = require('sha256');

const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;

let session = require('express-session');
app.use(session({
    secret : 'mh',
    resave : false,
    saveUninitialized : true,
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function(user, done) {
    console.log("serializeUser");
    console.log(user.userid);
    done(null, user.userid);
});

passport.deserializeUser(function(userid, done) {
    console.log("deserializeUser");
    console.log(userid);

    let sql = "select * from account where userid=?";
    conn.query(sql, [userid], function(err, result) {
        if (err) return done(err);
        if (result.length > 0) {
            done(null, result[0]);
        } else {
            done(new Error("사용자 없음"));
        }
    });
});

app.use('/scripts', express.static(__dirname + '/scripts'));
app.use('/images', express.static(__dirname + '/images'));

app.use(express.static("public"));

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended:true}));

const db = require('node-mysql/lib/db');
app.set('view engine', 'ejs');

app.listen(8080, function(){
    console.log("포트 8080으로 서버 대기중...");
});

app.get('/', function(req, res){
    res.render('index.ejs', {user: req.user});
});

app.get('/working', function(req, res){
    res.sendFile(__dirname + '/pages/working.html');
});

app.get('/enter', function(req, res){
    res.render('enter.ejs');
});

app.post('/save', function(req, res){
    console.log(req.body.title);
    console.log(req.body.content);
    console.log(req.body.email);
    let sql = "insert into post (title, content, created, email) value(?, ?, NOW(), ?)";
    let params = [req.body.title, req.body.content, req.body.email];
    conn.query(sql, params, function(err, result) {
        if (err) throw err;
        console.log('데이터 추가 성공');
    });
    res.redirect('/list');
});

app.get('/list', function(req, res){
    conn.query("select * from post", function(err, rows, fields){
        if (err) throw err;
        console.log(rows);
    res.render('list.ejs', {data : rows});
    });
});

app.post('/delete', function(req, res){
    console.log(req.body); 
    let sql = "delete from post where id = ?";
    conn.query(sql, [req.body.id], function(err, result) {
        if (err) throw err;
        console.log('삭제 완료');
    });
    res.send('삭제 완료');
});

app.get('/content/:id', function(req, res){
    console.log(req.params.id);
    let sql = "select * from post where id = ?";
    conn.query(sql, [req.params.id], function(err, result){
        if (err) throw err;
        console.log(result);
    res.render('content.ejs', {data : result[0]});
    });
});

app.get("/edit/:id", function(req, res){
    console.log(req.params.id);
    let sql = "select * from post where id = ?";
    conn.query(sql, [req.params.id], function(err, result){
        if (err) throw err;
        console.log(result);
    res.render('edit.ejs', {data : result[0]});
    });
});

app.post('/edit', function(req, res){
    console.log(req.body); 
    let sql = "UPDATE post SET title = ?, content = ?, email = ?, created = NOW() WHERE id = ?";
    let params = [req.body.title, req.body.content, req.body.email, req.body.id];
    conn.query(sql, params, function(err, result) {
        if (err) throw err;
        console.log('수정 완료');
        res.redirect('/list');
    });
});

let cookieParser = require('cookie-parser');

app.use(cookieParser('mh'));
app.get('/cookie', function(req,res){
    let milk = parseInt(req.signedCookies.milk) + 1000;
    if(isNaN(milk))
        {
            milk = 0;
        }
    res.cookie('milk', milk, {signed : true});
    res.send('product : ' + milk + "원");
});

app.get("/session", function(req, res){
    if(isNaN(req.session.milk)){
        req.session.milk = 0;
    }
    req.session.milk = req.session.milk + 1000;
    res.send("session : " + req.session.milk + "원");
});

app.get("/login", function(req,res){
    console.log(req.session);
    if(req.session.user){
        console.log('세션 유지');
        res.render('index.ejs', {user : req.session.user});
    }else{
    res.render("login.ejs");
    }
});

app.post(
    '/login', 
    passport.authenticate("local", {
        failureRedirect: "/fail",
    }),
    function(req, res){
        console.log(req.session);
        console.log(req.user);
        res.render("index.ejs", {user : req.user});
    },

);

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


app.get("/logout", function(req,res){
    console.log("로그아웃");
    req.session.destroy();
    res.render('index.ejs' , {user : null});
});

app.get("/signup", function(req,res){
    res.render("signup.ejs");
});

app.post('/signup', function(req, res){
    console.log(req.body.userid);
    console.log(sha(req.body.userpw)); 
    console.log(req.body.usergroup);
    console.log(req.body.useremail); 

    let sql = "insert into account (userid, userpw, usergroup, useremail) value(?, ?, ?, ?)";
    let params = [req.body.userid, sha(req.body.userpw), req.body.usergroup, req.body.useremail];
    conn.query(sql, params, function(err, result) {
        if (err) throw err;
        console.log('회원가입 성공');

        let user = {
            userid: req.body.userid,
            usergroup: req.body.usergroup,
            useremail: req.body.useremail
        };
        
        req.login({ userid: req.body.userid }, function(err) {
            if (err) return next(err);
            return res.render('index.ejs', { user: req.user });
        });
    });
});

app.get(
    '/facebook',
    passport.authenticate(
        'facebook'
    )
);

app.get(
    '/facebook/callback',
    passport.authenticate(
        'facebook',
        {
            successRedirect : '/',
            failureRedirect : "/fail",
        }
    ),
    function (req, res) {
        console.log(req.session);
        console.log(req.user);
        res.render("index.ejs", {user : req.user});
    }
);