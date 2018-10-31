//server side
const express = require("express");
const querystring = require("querystring");
const port = process.env.PORT || 3001;
const app = express();
const MongoClient = require("mongodb").MongoClient;
const dbUrl = 'mongodb://localhost:27017';
const DBName = "klack";
const DBUser = "admin";
const DBURI = "ds019886.mlat.com:198886";
const connectionString = process.env.CONNECTION_STRING || 'mongodb://localhost:27017/klack';
const mongoose = require("mongoose");

app.use(express.static("./public"));
app.use(express.json());

let messageSchema = new mongoose.Schema ({
    sender: {type: String, required: true},
    message: {type: String, required: true},
    timestamp: {type: Number, required: true}
})

let Message = mongoose.model('Message', messageSchema);

// List of all messages
// let messages = [];

// Track last active times for each sender
let users = {};

const db = mongoose.connection;

mongoose.connect(connectionString);
// can always add this for a error message
db.on('error', console.error.bind(console, 'connection error:'));
db.once("open", (err) => {
    if (err) {
        console.log(err);
        throw err;
    }
    app.listen(port, () => {
        console.log('server is running on port', port)
    });
})


// generic comparison function for case-insensitive alphabetic sorting on the name field
function userSortFn(a, b) {
  var nameA = a.name.toUpperCase(); // ignore upper and lowercase
  var nameB = b.name.toUpperCase(); // ignore upper and lowercase
  if (nameA < nameB) {
    return -1;
  }
  if (nameA > nameB) {
    return 1;
  }

  // names must be equal
  return 0;
}

app.get("/messages", (request, response) => {
  // get the current time
  const now = Date.now();

  // consider users active if they have connected (GET or POST) in last 15 seconds
  const requireActiveSince = now - 15 * 1000;

  // create a new list of users with a flag indicating whether they have been active recently
  usersSimple = Object.keys(users).map(x => ({
    name: x,
    active: users[x] > requireActiveSince
  }));

  // sort the list of users alphabetically by name
  usersSimple.sort(userSortFn);
  usersSimple.filter(a => a.name !== request.query.for);

  // update the requesting user's last access time
  users[request.query.for] = now;

  Message.find((err, messages) => {
      if(err) {
          return response.status(500).send();
      }
      // send the latest 40 messages and the full user list, annotated with active flags
      response.send({ messages: messages.slice(-40), users: usersSimple });
  });

});

app.post("/messages", (request, response) => {
  // add a timestamp to each incoming message.
  const timestamp = Date.now();
  request.body.timestamp = timestamp;

  // adding the new message to the database
  Message.create({name: request.body.sender, body: request.body.message, timestamp}, (err, message) => {
      if(err) {
          return response.status(500).send();
      }
      response.status(201).send(request.body);
  })
  

    users[request.body.sender] = timestamp;
});


