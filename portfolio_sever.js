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

app.use('/scripts', express.static(__dirname + '/scripts'));
app.use('/images', express.static(__dirname + '/images'));

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended:true}));

const db = require('node-mysql/lib/db');
app.set('view engine', 'ejs');

app.listen(8090, function(){
    console.log("포트 8090으로 서버 대기중...");
});
app.get('/', function(req, res){
    res.sendFile(__dirname + '/pages/index.html');
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
    res.sendFile(__dirname + '/pages/save.html');
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