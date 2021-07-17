const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const databasePath = path.join(__dirname, "userData.db");

const app = express();
app.use(cors());

app.use(express.json());
let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });

    app.listen(3002, () =>
      console.log("Server Running at http://localhost:3002/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

//api-1
app.post("/register/", async (request, response) => {
  const { username, password, name, gender } = request.body;

  const selectUserQuery = `SELECT *
     FROM user
     WHERE username='${username}';`;

  const dbQuery = await database.get(selectUserQuery);

  if (dbQuery !== undefined) {
    response.status(400);
    response.send("User already exists");
  } else {
    if (password.length < 6) {
      response.status(400);
      response.send("Password is too short");
    } else {
      const hashedPassword = await bcrypt.hash(password, 10);
      const insertUserQuery = `INSERT INTO user (name,username,password,gender)
       VALUES ('${name}','${username}','${hashedPassword}','${gender}');`;

      const dbAddUser = await database.run(insertUserQuery);
      response.status(200);
      response.send("User created successfully");
    }
  }
});

// API 2
app.post("/login/", async (request, response) => {
  console.log(request.body);

  /* const username = "adam_richard";
  const password = "richard_567"; */
  const { username, password } = request.body;
  console.log("hello", username, password);
  const getUserQuery = `SELECT *
    FROM user
    WHERE username ='${username}';`;

  const dbGetUser = await database.get(getUserQuery);
  if (dbGetUser === undefined) {
    response.status(400);
    response.send("Invalid user entered");
  } else {
    const isPasswordMatched = await bcrypt.compare(
      password,
      dbGetUser.password
    );

    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      };
      const jwtToken = await jwt.sign(payload, "MY_SECRET_TOKEN");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

// authenticate token
function authenticateToken(request, response, next) {
  const authHeader = request.headers["authorization"];
  let jwtToken;
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        const { userId, id, title, body } = request.body;
        request.body = {
          userId: userId,
          id: id,
          title: title,
          body: body,
        };
        next();
      }
    });
  }
}

//api 3
app.post("/posts/", authenticateToken, async (request, response) => {
  const { userId, id, title, body } = request.body;
  /* console.log("__________+__________");
  console.log(request.body);
  console.log("_____________________"); */
  const insertQuery = `insert into user_post (user_id,post_id,title,body)
                        values (${userId}, ${id}, "${title}", "${body}");`;

  const dbQuery = await database.run(insertQuery);
  // console.log(dbQuery);
  response.send(JSON.stringify("success"));
});

//api 4
app.get("/posts/:userId", authenticateToken, async (request, response) => {
  console.log("db query");

  const { userId } = request.params;

  const selectQuery = `select *
                        from user_post;`;
  const dbQuery = await database.all(selectQuery);
  console.log(dbQuery);
  response.send(JSON.stringify(dbQuery));
});

module.exports = app;
