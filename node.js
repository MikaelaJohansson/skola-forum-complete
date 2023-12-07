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
	response.sendFile(path.join(__dirname + '/reg.html'));
});

app.get('/loggin', function(request, response) {
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






app.post("/box", function (req, res) {
  
  if (!req.body.username) {
    res.status(400).send("username required!");
    return; 
  }
  let fields = ["username", "name", "posts"];
  for (let key in req.body) {
    if (!fields.includes(key)) {
      res.status(400).send("Unknown field: " + key);
      return; 
    }
  }
  
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
	
	let username = request.body.username;
	let password = request.body.password;

	
	if (username && password) {
		
		connection.query('SELECT * FROM login WHERE username = ? AND password = ?', [username, password], function(error, results, fields) {
			
			if (error) throw error;
		
			if (results.length > 0) {
				request.session.loggedin = true;
				request.session.username = username;
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

// MINNA API,ER
const COLUMNS = ["id", "username", "name", "posts"]; 

// visar min datorbas lista 
app.get("/post", function (req, res) {
  let sql = "SELECT * FROM post";
  let condition = createCondition(req.query); 
  console.log(sql + condition); 
 
  connection.query(sql + condition, function (err, result, fields) {
    res.send(result);
  });
});
let createCondition = function (query) {
  console.log(query);
  let output = " WHERE ";
  for (let key in query) {
    if (COLUMNS.includes(key)) {
     
      output += `${key}="${query[key]}" OR `;
    }
  }
  if (output.length == 7) {
    return ""; 
  } else {
    return output.substring(0, output.length - 4);
  }
};

// api som gör att man kan söka i min datorbas 
app.get("/post/:id", function (req, res) {
  let sql = "SELECT * FROM post WHERE id=" + req.params.id;
  console.log(sql);
  
  connection.query(sql, function (err, result, fields) {
    if (result.length > 0) {
      res.send(result);
    } else {
      res.sendStatus(404); 
    }
  });
});


// gör så att man kan lägga till en ny användare i datorbasens
app.post("/login", function (req, res) {
  if (!req.body.username) {
    res.status(400).send("username required!");
    return; 
  }
  let fields = ["username", "password"]; 
  for (let key in req.body) {
    if (!fields.includes(key)) {
      res.status(400).send("Unknown field: " + key);
      return; 
    }
  }
 
  let sql = `INSERT INTO login (username, password)
    VALUES ('${req.body.username}', 
    '${req.body.password}');
    SELECT LAST_INSERT_ID();`; 
  console.log(sql);

  connection.query(sql,function(err,result,fields){
    if (err){
      throw err;
    }else{
      res.redirect('/loggin');
    } 
  })
 
});

app.listen(3000);