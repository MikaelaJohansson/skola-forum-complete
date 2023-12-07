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

const crypto = require("crypto"); //INSTALLERA MED "npm install crypto" I KOMMANDOTOLKEN
function hash(data) {
  const hash = crypto.createHash("sha256");
  hash.update(data);
  return hash.digest("hex");
}










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



// kollar inloggning och skickar vidare till index med hashat lösen
const jwt = require("jsonwebtoken"); // installera med "npm install jsonwebtoken"
app.post("/auth", function (req, res) {
  console.log(req.body);
  if (!(req.body && req.body.username && req.body.password)) {
    // om efterfrågad data saknas i request
    res.sendStatus(400);
    return;
  }
  let sql = `SELECT * FROM login WHERE username='${req.body.username}'`;

  connection.query(sql, function (err, result, fields) {
    if (err) throw err;
    let passwordHash = hash(req.body.password);
    if (result[0].password == passwordHash) {
      //Denna kod skapar en token att returnera till anroparen.
      let payload = {
        sub: result[0].username, //sub är obligatorisk
      };
      let token = jwt.sign(payload, "EnHemlighetSomIngenKanGissaXyz123%&/");
      res.redirect("/index")
    } else {
      res.sendStatus(401);
    }
  });
});



// MINNA API,ER
const COLUMNS = ["id", "username", "name", "posts"]; 

// api visar min datorbas lista 
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


// gör så att man kan lägga till en ny användare i datorbasens hashat
app.post("/login", function (req, res) {
  if (!req.body.username) {
    res.status(400).send("username required!");
    return;
  }
  let fields = [ "username","password"]; // ändra eventuellt till namn på er egen databastabells kolumner
  for (let key in req.body) {
    if (!fields.includes(key)) {
      res.status(400).send("Unknown field: " + key);
      return;
    }
  }
  // OBS: näst sista raden i SQL-satsen står det hash(req.body.passwd) istället för req.body.passwd
  // Det hashade lösenordet kan ha över 50 tecken, så använd t.ex. typen VARCHAR(100) i databasen, annars riskerar det hashade lösenordet att trunkeras (klippas av i slutet)
  let sql = `INSERT INTO login (username, password)
    VALUES ('${req.body.username}', 
    '${hash(req.body.password)}');
    SELECT LAST_INSERT_ID();`; // OBS! hash(req.body.password) i raden ovan!
  console.log(sql);

  connection.query(sql, function (err, result, fields) {
    if (err) throw err;
    console.log(result);
    let output = {
      id: result[0].insertId,
      username: req.body.username,
    }; // OBS: bäst att INTE returnera lösenordet
    res.redirect('/loggin');
  });
});

// kontrollera att användardata finns
function isValidUserData(body) {
  return body && body.username; 
}

// put rout för att ändra i datorbasen
app.put("/post/:id", function (req, res) {
  
  if (!(req.body && req.body.username && req.body.name && req.body.posts)) {
    res.sendStatus(400);
    return;
  }
  let sql = `UPDATE post 
        SET username = '${req.body.username}', name = '${req.body.name}', posts = '${req.body.posts}'
        WHERE id = ${req.params.id}`;

  connection.query(sql, function (err, result, fields) {
    if (err) {
      throw err;    
    } else {
      res.sendStatus(200);
    }
  });
});



app.listen(3000);