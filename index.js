const express = require('express');

// ejs is a template library
// it allows us to store html in a file and then send it as back as response
const ejs = require('ejs');
const expressLayouts = require('express-ejs-layouts');
const app = express();

// read in our .env file
require("dotenv").config();
const { createPool } = require('mysql2/promise');

app.use(expressLayouts)

// tell Express that we are using ejs
app.set("view engine", "ejs");

// tell EJS which layout to use
app.set('layout', 'layouts/base')

// enable form submission via browser
app.use(express.urlencoded({
    extended: true
}));

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

app.get('/', function (req, res) {


    const todayDate = new Date().toLocaleDateString("en-GB");
    // the first arg to res.render is the name
    // of the ejs file to send back to the user
    // and it will be assumed to be in the views folder
    res.render("home", {
        "todayDate": todayDate
    });

});


app.get('/customers', async function (req, res) {


    const sql = `
        SELECT * FROM Customers
            JOIN Companies ON
                Customers.company_id = Companies.company_id
        ORDER BY Customers.first_name, Customers.last_name
        `
    // connection.query takes in the SQL statement as parameter
    // and returns an array of two elements
    // index 0 is the results
    // index 1 is some metadata
    const [customers] = await connection.execute({
        "sql": sql,
        "nestTables": true
    });

    res.render('customers/index', {
        customers: customers
    })
})


app.get('/customers/create', async function (req, res) {
    const [companies] = await connection.execute("SELECT * FROM Companies");
    const [employees] = await connection.execute("SELECT * FROM Employees");

    // get all the products to display in the form
    const [products] = await connection.execute("SELECT * FROM Products");

    res.render('customers/create', {
        companies, employees, products
    })
})


// one route to process the form
app.post('/customers/create', async function (req, res) {
    // whenever the user has submitted via the form
    // is in req.body
    console.log(req.body);

    // a transaction allows us to perform two or more SQL updates or inserts or deletes
    // and count them as the same atomic operation

    // 1. get a connection instance from the connection pool
    const conn = await connection.getConnection();

    try {
        await conn.beginTransaction();

        // do all your SQL mutations (update, insert, delete) here
        const sql = `
        INSERT INTO Customers (first_name, last_name, email, company_id, employee_id)
            VALUES (?, ?, ?, ?, ?);
    `
        const [results] = await connection.execute(sql, [
            req.body.first_name,
            req.body.last_name,
            req.body.email,
            req.body.company_id,
            req.body.employee_id
        ]);

        // get the id of the newly created customers
        const newCustomerId = results.insertId;

        // products will be an array of product ids
        // p will be the id of the product that the user wants to add
        if (Array.isArray(req.body.products)) {
            for (let p of req.body.products) {
                const sql = `INSERT INTO CustomerProduct (customer_id, product_id) VALUES (?, ?)`;
                await connection.execute(sql, [newCustomerId, p]);
            }
        }
        // confirm all mutations
        await conn.commit();

    } catch (e) {
        await conn.rollback();
    } finally {
        await conn.release();
    }

    res.redirect('/customers')
})









app.listen(3000, function () {
    console.log("Server started");
})
