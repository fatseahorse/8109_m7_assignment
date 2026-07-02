const express = require('express');
const ejs = require('ejs'); // ejs is a template library
const expressLayouts = require('express-ejs-layouts');
require('dotenv').config(); // read in our .env file

const app = express();
app.set('view engine', 'ejs');
app.use(expressLayouts);
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true}));
app.set('layout', 'layouts/base');

const {createPool} = require('mysql2/promise');


// create a connection pool
const connection = createPool(
    {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT

    }
)

app.get('/', function(req,res){

    const todayDate = new Date().toLocaleDateString("en-GB");
    // the first arg to res.render is the name 
    // of the ejs file to send back to the user
    // and it will be assumed to be in the views folder
    res.render("landing", {
        "todayDate": todayDate
    });

});

app.get('/customers', async function(req,res){
    const sql = `
        SELECT * FROM Customers
            JOIN Companies ON
                Customers.company_id = Companies.company_id
        `
    // connection.query takes in the SQL statement as parameter
    // and returns an array of two elements
    // index 0 is the results
    // index 1 is some metadata
    const responses = await connection.query({
        "sql": sql,
        "nestTables": true
    });
    // res.send(responses[0]);
    console.log(responses[0])
    res.render('customers/index', {
        customers: responses[0]
    })
})

app.get('/customers/create', async function(req,res){
    res.render('customers/create')
})

app.listen(3000, function(){
    console.log("Server started");
})