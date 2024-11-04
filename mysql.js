const mysql = require('mysql')
require("dotenv").config()
const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  });

connection.connect(function (error) {
  try {
    if (error) {
      console.error("Error connecting to MySQL:", error.message);
      throw error;
    }
    console.log("Connected to MySQL");
  } catch (error) {
    console.log("error", error);
  }
});

module.exports = connection