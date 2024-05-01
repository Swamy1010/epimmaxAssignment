const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const databasePath = path.join(__dirname, "userTasks.db");

const app = express();

app.use(express.json());

let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });

    app.listen(4002, () =>
      console.log("Server Running at http://localhost:4002/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

function authenticateToken(request, response, next) {
  let jwtToken;
  const authHeader = request.headers["authorization"];
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
        next();
      }
    });
  }
}

//Create User:
app.post("/createuser/", async (request, response) => {
  const { username, password } = request.body;
  const hashedPassword = await bcrypt.hash(password);
  const selectUserQuery = `SELECT * FROM Users WHERE username = '${username}';`;
  const databaseUser = await database.get(selectUserQuery);
  if (databaseUser === undefined) {
    const createQuery = `INSERT INTO Users (username,password) 
                            VALUES(${username},${hashedPassword});`;
    await database.run(createQuery);
  } else {
    response.status(400);
    response.send("Invalid password");
  }
});

//Login API:

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM Users WHERE username = '${username}';`;
  const databaseUser = await database.get(selectUserQuery);
  if (databaseUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(
      password,
      databaseUser.password
    );
    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

//getAllTasks API:

app.get("/tasks", authenticateToken, async (request, response) => {
  const getStatesQuery = `
    SELECT
      *
    FROM
      Tasks;`;
  const tasksArray = await database.all(getStatesQuery);
  response.send(tasksArray);
});

//get Task on taskId API:

app.get("/tasks/:id/", authenticateToken, async (request, response) => {
  const { id } = request.params;
  const getStateQuery = `
    SELECT 
      *
    FROM 
      state 
    WHERE 
      state_id = ${id};`;
  const tasks = await database.get(getStateQuery);
  response.send(tasks);
});

//Creating task API:

app.post("/tasks", authenticateToken, async (request, response) => {
  let currentdate = new Date();
  let dateTime =
    currentdate.getDate() +
    "/" +
    (currentdate.getMonth() + 1) +
    "/" +
    currentdate.getFullYear() +
    "  " +
    currentdate.getHours() +
    ":" +
    currentdate.getMinutes() +
    ":" +
    currentdate.getSeconds();

  const { title, description, status, assignee_id } = request.body;
  const postDistrictQuery = `
  INSERT INTO
    Tasks (title, description, status,assignee_id,created_at)
  VALUES
    (${title}, '${description}', ${status}, ${assignee_id}, ${dateTime});`;
  await database.run(postDistrictQuery);
  response.send("Task Successfully Added");
});

//Delating Task API:

app.delete("/tasks/:id", authenticateToken, async (request, response) => {
  const { id } = request.params;
  const deleteTaskQuery = `
  DELETE FROM
    Tasks
  WHERE
    id = ${id} 
  `;
  await database.run(deleteTaskQuery);
  response.send("Task Removed");
});

//Updating Task API:

app.put("/tasks/:id", authenticateToken, async (request, response) => {
  let currentdate = new Date();
  let dateTime =
    currentdate.getDate() +
    "/" +
    (currentdate.getMonth() + 1) +
    "/" +
    currentdate.getFullYear() +
    "  " +
    currentdate.getHours() +
    ":" +
    currentdate.getMinutes() +
    ":" +
    currentdate.getSeconds();
  const { id } = request.params;
  const { title, description, status, assignee_id } = request.body;
  const updateDistrictQuery = `
  UPDATE
    Tasks
  SET
    title = '${title}',
   description = ${description},
    status = ${status},
    assignee_id= ${assignee_id}, 
    updated_at = ${dateTime}
  WHERE
    id = ${id};
  `;

  await database.run(updateDistrictQuery);
  response.send("Task Details Updated");
});

module.exports = app;
