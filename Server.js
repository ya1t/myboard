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

app.use('/scripts', express.static(__dirname + '/scripts'));
app.use('/images', express.static(__dirname + '/images'));

app.use(express.static("public"));

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended:true}));

const db = require('node-mysql/lib/db');
//app.use(bodyParser.urlencoded({extended:true}));
app.set('view engine', 'ejs');

app.listen(8080, function(){
    console.log("포트 8080으로 서버 대기중...");
});
app.get('/book', function(req, res){
    res.send('도서 목록 관련 페이지입니다.');
});
app.get('/mh', function(req, res){
    res.send('mh입니다.');
});
/*
app.get('/', function(req, res){
    res.sendFile(__dirname + '/pages/index.html');
    //res.sendStatus(200); //ok
    //res.sendStatus(400); //bad request
    //res.sendStatus(403); //forbidden
    //res.sendStatus(404); //not found
    //res.sendStatus(500); //Internal Server Error
    //res.sendStatus(503); //Service Unavailable
});
*/
app.get('/', function(req, res){
    res.render('index.ejs');
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

let session = require('express-session');
app.use(session({
    secret : 'mh',
    resave : false,
    saveUninitialized : true,
}));

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
/*
app.post('/login', function(req, res){
    console.log("아이디 : " + req.body.userid);
    console.log("비밀번호 : " + req.body.userpw); 

    let sql = "select * from account where userid=?";
    let params = [req.body.userid, req.body.userpw];
    conn.query(sql, params, function(err, result) {
        if (err) throw err;
        console.log("result");
        if(result[0].userpw == req.body.userpw){
            req.session.user = req.body;
            console.log("새로운 로그인");
            res.render('index.ejs' , {user : req.session.user});
        }else{
            res.render('login.ejs')
            console.log("잘못된 비밀번호")
        }
    });
});
*/
app.post('/login', function(req, res){
    console.log("아이디 : " + req.body.userid);
    console.log("비밀번호 : " + sha(req.body.userpw)); 

    let sql = "select * from account where userid=?";
    let params = [req.body.userid];
    conn.query(sql, params, function(err, result) {
        if (err) throw err;

        if(result.length > 0) {
            if(result[0].userpw == sha(req.body.userpw)){
                req.session.user = req.body;
                console.log("새로운 로그인");
                res.render('index.ejs' , {user : req.session.user});
            } else {
                console.log("잘못된 비밀번호");
                res.render('login.ejs', {error: "잘못된 비밀번호입니다."});
            }
        } else {
            console.log("잘못된 아이디");
            res.render('login.ejs', {error: "잘못된 아이디입니다."});
        }
    });
});


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
//        console.log('회원가입 성공');
        console.log('회원가입 성공');
        req.session.user = {
            userid: req.body.userid,
            userpw: sha(req.body.userpw),
            usergroup: req.body.usergroup,
            useremail: req.body.useremail
        };
        res.render('index.ejs', { user: req.session.user });
    });
});
