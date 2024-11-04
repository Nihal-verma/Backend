const connection = require("../../mysql");

async function queryPromiseWithAsync(sql, values) {
    return new Promise((resolve, reject) => {
      connection.query(sql, values, (err, result) => {
        if (err) {
          console.error("Error in queryPromise:", err);
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
}

module.exports = {queryPromiseWithAsync}