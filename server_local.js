const express = require('express');
const mysql = require("mysql");
const sha = require('sha256');
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const session = require('express-session');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

const app = express();

var conn = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "mhnawara",
  database: "myboard",
  port: 3306 // MySQL의 기본 포트
});
conn.connect();
// ejs 파일들은 모두 8080 포트로 설정되어 있으므로 이 서버 코드는 참고만 하길 바람
// 작동시 3060 서버와 8080 서버 모두 실행해야 함

app.use(bodyParser.urlencoded({extended:true}));
app.use(cookieParser('mh'));
app.use(session({
    secret : 'mh',
    resave : false,
    saveUninitialized : true,
}));

app.use(passport.initialize());
app.use(passport.session());

app.use('/scripts', express.static(__dirname + '/scripts'));
app.use('/images', express.static(__dirname + '/images'));
app.use(express.static("public"));
app.set('view engine', 'ejs');

// Passport 전략 및 직렬화/역직렬화
passport.serializeUser(function(user, done) {
    done(null, user.userid);
});

passport.deserializeUser(function(userid, done) {
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

passport.use(
    new LocalStrategy(
        {
            usernameField: "userid",
            passwordField: "userpw",
            session: true,
            passReqToCallback: false,
        },
        function (userid, userpw, done){
        let sql = "select * from account where userid=?";
        conn.query(sql, [userid], function(err, result) {
            if (err) return done(err);
            if(result.length > 0) {
                if(result[0].userpw == sha(userpw)){
                    done(null, result[0]);
                } else {
                    done(null, false, { message: "잘못된 비밀번호입니다." });
                }
            } else {
                done(null, false, { message: "잘못된 아이디입니다." });
            }
        });
        }
    )
);

function redirectHomeAfterLogin(req, res) {
    req.login({ userid: req.body.userid }, function(err) {
        if (err) return next(err);
        return res.render('index.ejs', { user: req.user });
    });
}

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
    let sql = "insert into post (title, content, created, email) value(?, ?, NOW(), ?)";
    let params = [req.body.title, req.body.content, req.body.email];
    conn.query(sql, params, function(err, result) {
        if (err) throw err;
        res.redirect('/list');
    });
});

app.get('/list', function(req, res){
    conn.query("select * from post", function(err, rows, fields){
        if (err) throw err;
        res.render('list.ejs', {data : rows});
    });
});

app.post('/delete', function(req, res){
    let sql = "delete from post where id = ?";
    conn.query(sql, [req.body.id], function(err, result) {
        if (err) throw err;
        res.send('삭제 완료');
    });
});

app.get('/content/:id', function(req, res){
    let sql = "select * from post where id = ?";
    conn.query(sql, [req.params.id], function(err, result){
        if (err) throw err;
        res.render('content.ejs', {data : result[0]});
    });
});

app.get("/edit/:id", function(req, res){
    let sql = "select * from post where id = ?";
    conn.query(sql, [req.params.id], function(err, result){
        if (err) throw err;
        res.render('edit.ejs', {data : result[0]});
    });
});

app.post('/edit', function(req, res){
    let sql = "UPDATE post SET title = ?, content = ?, email = ?, created = NOW() WHERE id = ?";
    let params = [req.body.title, req.body.content, req.body.email, req.body.id];
    conn.query(sql, params, function(err, result) {
        if (err) throw err;
        res.redirect('/list');
    });
});

app.get("/login", function(req,res){
    if(req.session.user){
        res.render('index.ejs', {user : req.session.user});
    } else {
        res.render("login.ejs");
    }
});

app.post('/login', passport.authenticate("local", {
        failureRedirect: "/fail",
    }), redirectHomeAfterLogin);

app.get("/logout", function(req,res){
    req.session.destroy();
    res.render('index.ejs' , {user : null});
});

app.get("/signup", function(req,res){
    res.render("signup.ejs");
});

app.post('/signup', function(req, res){
    let sql = "insert into account (userid, userpw, usergroup, useremail) value(?, ?, ?, ?)";
    let params = [req.body.userid, sha(req.body.userpw), req.body.usergroup, req.body.useremail];
    conn.query(sql, params, function(err, result) {
        if (err) throw err;
        redirectHomeAfterLogin(req, res);
    });
});

// 서버 작동 콘솔
app.listen(3060, function(){
    console.log("포트 3060으로 서버 대기중...");
    console.log("http://localhost:3060/")
});
