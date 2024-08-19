const mysql = require("mysql");

const conn = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "mhnawara",
    database: "myboard",
});
// port 번호 다를시 여기에 기입(따옴표 필요 없음)

conn.connect((err) => {
    if (err) throw err;
    console.log("db연결 와 다행이다");
});

module.exports = conn;