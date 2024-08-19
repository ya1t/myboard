// const 코드 ---------------------------------------------------------------------------------------------------------
const express = require('express');
const passport = require("passport");
const session = require('express-session');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const LocalStrategy = require("passport-local").Strategy;
const conn = require('./db');
const sha = require('sha256');

let multer = require('multer');
let storage = multer.diskStorage({
    destination : function(req, file, done){
        done(null, './public/image/')
    },
    filename : function(req, file, done){
        done(null, Date.now() + path.extname(file.originalname));
    }
});
let upload = multer({storage : storage});
let imagepath = '';
const path = require('path');

const app = express();

// app.use 코드 ---------------------------------------------------------------------------------------------------------
app.use(express.static("public"));
app.use("/public/image", express.static(path.join(__dirname, 'public', 'image')));

app.use(session({
    secret : 'mh',
    resave : false,
    saveUninitialized : true,
}));
// 세션 코드는 인증 코드보다 앞에 위치해야 함

// passport 관련 코드 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
app.use(passport.initialize());
app.use(passport.session());

app.use(bodyParser.urlencoded({extended:true}));
app.use(cookieParser('mh'));

require('./strategies/facebook')(passport);
require('./strategies/google')(passport);
require('./strategies/naver')(passport);
require('./strategies/kakao')(passport);

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

passport.use(new LocalStrategy({
    usernameField: 'userid', 
    passwordField: 'userpw', 
}, function (userid, userpw, done) {
    let sql = "select * from account where userid=?";
    conn.query(sql, [userid], function (err, result) {
        if (err) return done(err);
        if (result.length === 0) {
            return done(null, false, { message: 'Incorrect username.' });
        }

        const user = result[0];
        if (user.userpw !== sha(userpw)) { 
            return done(null, false, { message: 'Incorrect password.' });
        }

        return done(null, user); 
    });
}));

// app 관련 코드 ---------------------------------------------------------------------------------------------------------
app.get('/', function(req, res){
    console.log(req.user);
    res.render('index.ejs', {user: req.user});
});

// 게시물 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
app.get('/enter', function(req, res){
    res.render('enter.ejs');
});

app.post('/save', function(req, res){
    console.log(req.body.title);
    console.log(req.body.content);
    console.log(req.body.email);
    console.log(imagepath);

    let sql = "insert into post (title, content, created, email, imagepath) value(?, ?, NOW(), ?, ?)";
    let params = [req.body.title, req.body.content, req.body.email, imagepath];
    conn.query(sql, params, function(err, result) {
        if (err) throw err;
        console.log('데이터 추가 성공');
        res.redirect('/list');
    });
});
/*
app.get('/list', function(req, res){
    conn.query("select * from post", function(err, rows, fields){
        if (err) throw err;
    //    console.log(rows);
        console.log("게시물 리스트 불러옴 rows는 너무 길어서 콘솔에서 뺐음")
    res.render('list.ejs', {data : rows});
    });
});
*/
app.get('/list', function(req, res){
    // 현재 페이지를 가져옵니다. 기본값은 1
    let page = req.query.page ? parseInt(req.query.page) : 1;
    let limit = 12; // 한 페이지에 보여줄 게시물 수
    let offset = (page - 1) * limit; // 시작점

    // 전체 게시물 수를 가져옵니다.
    conn.query("SELECT COUNT(*) AS count FROM post", function(err, countResult){
        if (err) throw err;

        let totalPosts = countResult[0].count;
        let totalPages = Math.ceil(totalPosts / limit);

        // 현재 페이지의 게시물들을 가져옵니다.
        let sql = "SELECT * FROM post ORDER BY created DESC LIMIT ? OFFSET ?";
        conn.query(sql, [limit, offset], function(err, rows){
            if (err) throw err;

            // AJAX 요청이라면, 필요한 부분만 렌더링하여 반환
            if (req.xhr) {
                res.render('partials/list_items.ejs', {data: rows});
            } else {
                res.render('list.ejs', {
                    data: rows,
                    currentPage: page,
                    totalPages: totalPages
                });
            }
        });
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

app.get('/content/:id', function(req, res) {
    let sql = "select * from post where id = ?";
    conn.query(sql, [req.params.id], function(err, result) {
        if (err) {
            console.error(err);
            return res.status(500).send('Internal Server Error');
        }

        if (result.length > 0) {
            console.log(result);
            res.render('content.ejs', { data: result[0] });
        } else {
            res.status(404).send('Content not found');
        }
    });
});


app.get("/edit/:id", function(req, res){
    console.log(req.params.id);
    let sql = "select * from post where id = ?";
    conn.query(sql, [req.params.id], function(err, result){
        if (err) throw err;
        if (result.length > 0) {
            res.render('edit.ejs', {data : result[0]});
        } else {
            console.log(result)
            res.status(404).send('Post not found');
        }
    });
});

app.post('/edit', upload.single('picture'), function(req, res){
    console.log(req.body); 
    let sql = "UPDATE post SET title = ?, content = ?, email = ?, created = NOW(), imagepath = ? WHERE id = ?";
    let params = [req.body.title, req.body.content, req.body.email, imagepath, req.body.id];
    conn.query(sql, params, function(err, result) {
        if (err) throw err;
        console.log('수정 완료');
        res.redirect('/list');
    });
});

app.post('/photo', upload.single('picture'), function(req, res){
    imagepath = '\\' + req.file.path;
    console.log("app.post: " + imagepath);
    console.log(req.file.path);
})

app.get('/search', function(req, res){
    console.log(req.query.value);
    let sql = "select * from post where title like ? or content like ?";

    const searchValue = `%${req.query.value}%`;

    conn.query(sql, [searchValue, searchValue], function(err, result){
        if (err) throw err;
        console.log(result);
        res.render('sresult.ejs', {data : result});
    });
})

// 회원관리 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
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

// 플랫폼 인증 ---------------------------------------------------------------------------------------------------------
app.get('/facebook', passport.authenticate('facebook'));
app.get('/facebook/callback', passport.authenticate('facebook', {
    successRedirect : '/',
    failureRedirect : "/fail",
}));

app.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/google/callback', passport.authenticate('google', { failureRedirect: '/fail' }), function(req, res) {
    res.redirect('/');
});

app.get('/naver', passport.authenticate('naver'));
app.get('/naver/callback', passport.authenticate('naver', {
    successRedirect : '/',
    failureRedirect : "/fail",
}));

app.get('/naver', passport.authenticate('naver'));
app.get('/naver/callback', passport.authenticate('naver', {
    successRedirect : '/',
    failureRedirect : "/fail",
}));

app.get('/kakao', passport.authenticate('kakao'));
app.get('/kakao/callback', passport.authenticate('kakao', {
    successRedirect : '/',
    failureRedirect : "/fail",
}));

// 서버 작동 콘솔 -------------------------------------------------------------------------------------------------------
app.listen(8080, function(){
    console.log("포트 8080으로 서버 대기중...");
    console.log("http://localhost:8080/")
    console.log("http://192.168.0.71:8080/")
});
