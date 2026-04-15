const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',  // Change if you have password
    database: 'meditrack'
};

const createConnection = async () => {
    return mysql.createConnection(dbConfig);
};

module.exports = { createConnection };