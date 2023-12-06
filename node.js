const mysql = require('mysql');
const express = require('express');
const session = require('express-session');
const path = require('path');
let fs = require("fs");

const connection = mysql.createConnection({
  host: "localhost", 
  user: "root", 
  password: "", 
  database: "forum", 
  multipleStatements: true,
});

const app = express();

app.use(session({
	secret: 'secret',
	resave: true,
	saveUninitialized: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'statics')));

app.get('/', function(request, response) {
	response.sendFile(path.join(__dirname + '/loggin.html'));
});






// skriver ut databasen till html sidan
app.get("/index", function (req,res){
 
  connection.query("select * from post", function (err, result){
    if (err) throw err;
    
    fs.readFile("index.html", "utf-8", function (err, data){
      if (err) throw err;

      let htmlArray = data.split("***NODE***");
      let output = htmlArray[0]; 
     
      for (let key in result[0]){
        output += `<th>${key}</th>`;
      }

      output += htmlArray[1]; 

      for (let user of result){
        output += "<tr>";
        for (key in user){
          output += `<td><br>${user[key]}<br></td>`;  
        }
        output += "</tr>";
      }
    
      output += htmlArray[2]; 
      
      
      res.send(output);
    })     
  })      
})





// skickar över data till datorbasen från webbsida input
app.post("/box", function (req, res) {
  // kod för att validera input
  if (!req.body.username) {
    res.status(400).send("username required!");
    return; // avslutar metoden
  }
  let fields = ["username", "name", "posts"]; // ändra eventuellt till namn på er egen databastabells kolumner
  for (let key in req.body) {
    if (!fields.includes(key)) {
      res.status(400).send("Unknown field: " + key);
      return; // avslutar metoden
    }
  }
  // kod för att hantera anrop
  let sql = `INSERT INTO post (username, name, posts)
  VALUES ('${req.body.username}', 
  '${req.body.name}',
  '${req.body.posts}');
  SELECT LAST_INSERT_ID();`; 
  connection.query(sql, function(err,result){
    if (err) console.log(err);
    res.redirect("/index")
  })  
});



// kollar inloggning och skickar vidare till index
app.post('/auth', function(request, response) {
	// Capture the input fields
	let username = request.body.username;
	let password = request.body.password;

	// Ensure the input fields exists and are not empty
	if (username && password) {
		// Execute SQL query that'll select the account from the database based on the specified username and password
		connection.query('SELECT * FROM login WHERE username = ? AND password = ?', [username, password], function(error, results, fields) {
			// If there is an issue with the query, output the error
			if (error) throw error;
			// If the account exists
			if (results.length > 0) {
				// Authenticate the user
				request.session.loggedin = true;
				request.session.username = username;
				// Redirect to home page
				response.redirect('/index');
        return;
			} else {
				response.send('Incorrect Username and/or Password!');
			}			
			response.end();
		});
	} else {
		response.send('Please enter Username and Password!');
		response.end();
	}
});



app.listen(3000);