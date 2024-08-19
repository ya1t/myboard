var mysql = require("mysql");
var conn = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "mhnawara",
  database: "dbtest",
});

conn.connect();

var conn2 = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "mhnawara",
    database: "student",
  });
  
  conn2.connect();
  
const express = require("express");
const app = express();

app.listen(3500, function () {
  console.log("포트 3500으로 서버 대기중 ... ");
});
app.get("/book", function (req, res) {
  res.send("도서 목록 관련 페이지입니다.");
});
app.get("/", function (req, res) {
  res.sendFile(__dirname + "/index.html");
});

app.get("/list", function (req, res) {
  conn.query("select * from 고객", function (err, rows, fields) {
    if (err) throw err;
    console.log(rows);
    res.send("dbtest 고객 테이블입니다.");
  });
});

app.get("/order", function (req, res) {
    conn.query("select * from 주문", function (err, rows, fields) {
      if (err) throw err;
      console.log(rows);
      res.send("dbtest 주문 테이블입니다.");
    });
  });

  app.get("/product", function (req, res) {
    conn.query("select * from 제품", function (err, rows, fields) {
      if (err) throw err;
      console.log(rows);
      res.send("dbtest 제품 테이블입니다.");
    });
  });

  app.get("/major", function (req, res) {
    conn2.query("select * from major", function (err, rows, fields) {
      if (err) throw err;
      console.log(rows);
      res.send("student major 테이블입니다.");
    });
  });

  app.get("/member", function (req, res) {
    conn2.query("select * from member", function (err, rows, fields) {
      if (err) throw err;
      console.log(rows);
      res.send("student member 테이블입니다.");
    });
  });

