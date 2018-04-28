import socketio from 'socket.io';
import http from 'http';
import express from 'express';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import socketioJwt from 'socketio-jwt';
import cors from 'cors';
import path from 'path';
import Chat from './models/chat_data';
import User from './models/user_model';
import apiRouter from './router';
import projectConfig from './config/project.config';

// initialize
const app = express();
const server = http.createServer(app);
const io = socketio(server);

// enable/disable cross origin resource sharing if necessary
app.use(cors());

const env = process.env.NODE_ENV || 'development';
const config = projectConfig[env];
mongoose.connect(config.mongoURI);

// set mongoose promises to es6 default
mongoose.Promise = global.Promise;

app.set('view engine', 'ejs');
app.use(express.static('static'));
// enables static assets from folder static
app.set('views', path.join(__dirname, '../app/views'));
// this just allows us to render ejs from the ../app/views directory

// enable json message body for posting data to API
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use('/api', apiRouter);

// default index route
app.get('/', (req, res) => {
  res.send('hi');
});

// START THE SERVER
// =============================================================================
const port = process.env.PORT || 9090;
// app.listen(port);
server.listen(port);

console.log(`listening on: ${port}`);

// export default app;

io.sockets
  .on('connection', socketioJwt.authorize({
    secret: process.env.AUTH_SECRET,
    timeout: 15000, // 15 seconds to send the authentication message
  })).on('authenticated', (socket) => {
    // this socket is authenticated, we are good to handle more events from it.
    console.log(`authenticated hello! user from:${JSON.stringify(socket.decoded_token)}`);
    const userID = socket.decoded_token.sub;
    // TODO: socket should join all the rooms in it's history
    socket.emit('getMyUserID', userID);
    socket.on('getExistingMsgs', (withUsr) => {
      console.log(`In getExistingMsgs, self= ${userID}, chatting with= ${withUsr} `);
      User.findById(userID, (err, usr) => {
        if (err) {
          console.log(`socketIO error in accessing user id=${usr._id}`);
        } else {
          // Figure out the room number; create roomID in new structure.
          // Check request history & match history to find the roomID

          // const index = usr.match_history.findIndex((element) => {
          //   return element == withUsr;
          // });
          const roomIDPossible1 = `${withUsr}${userID}`;
          const roomIDPossible2 = `${userID}${withUsr}`;
          console.log(`roomIDPossible1 = ${roomIDPossible1}, roomIDPossible2 = ${roomIDPossible2}`);

          const index1 = usr.chatroom.findIndex((element) => {
            return element == roomIDPossible1;
          });
          const index2 = usr.chatroom.findIndex((element) => {
            return element == roomIDPossible2;
          });
          console.log(`index1 = ${index1} index2 = ${index2}`);
          let roomID = '';
          if (index1 >= 0) {
            roomID = usr.chatroom[index1];
            socket.join(roomID);
            console.log(`Joined roomID =${roomID}`);
            _sendExistingMessages(socket, roomID);
          } else if (index2 >= 0) {
            roomID = usr.chatroom[index2];
            console.log(`Joined roomID =${roomID}`);
            socket.join(roomID);
            _sendExistingMessages(socket, roomID);
          } else {
            console.log('no roomID found');
          }

          // console.log(`my match_history = ${usr.match_history}, index = ${index}`);
          // if (index >= 0 && index < usr.match_history.length) {
          //   const roomID = usr.chatroom[index];
          //   console.log(`Room ID = ${roomID}`);
          //   socket.join(roomID);
          //   _sendExistingMessages(socket, roomID);
          // }
        }
      });
    });
    socket.on('message', (message) => { return onMessageReceived(message, socket, userID); });
    // TODO: add the socket to user's profile
    socket.on('disconnect', () => { console.log(`socket is disconnected. socketID = ${socket.id}  userID = ${userID}`); });
  }).on('hello', (data) => {
    console.log(`Receive hello event from client: ${data}`);
  });


function _sendExistingMessages(socket, roomID) {
  console.log(`In sending the exisiting msgs to room ${roomID}`);
  const query = { roomID };
  Chat.find(query, null, { sort: 'created_at' }, (err, msgs) => {
    console.log(`Sending exisiting Msg to roomID: ${roomID}`);
    io.to(roomID).emit('exisitingMsgsResult', { roomID, messages: msgs.reverse() });
    // socket.emit('exisitingMsgsResult', msgs);
  });
  // const messages = db.collection('messages')
  //     .find({ chatId })
  //     .sort({ createdAt: 1 })
  //     .toArray((err, messages) => {
  //       // If there aren't any messages, then return.
  //       if (!messages.length) return;
  //       socket.emit('message', messages.reverse());
  //     });
}
  // When a user sends a message in the chatroom.
  // TODO: Probably let users know it's user id
function onMessageReceived(message, senderSocket, userID) {
  console.log(`Received mgs text:${message.text} userID:${userID} created_at:${message.createdAt}  senderSocket_id  = ${senderSocket.id}, roomID = ${message.roomID}`);
  _sendAndSaveMessage(message, senderSocket, false, userID);
}

function _sendAndSaveMessage(message, socket, fromServer, userID) {
  const messageData = new Chat();
  messageData.text = message.text;
  messageData.created_at = new Date(message.createdAt);
  messageData.user = userID;
  messageData.roomID = message.roomID;
  // messageData.user = message.user;

  messageData.save().then((msg) => {
    const msgToSend = msg;
    console.log(`in _sendAndSaveMessage msg = ${msg}`);
    // const emitter = fromServer ? io : socket.broadcast;  // TODO: Shouldn't broadcast; send to a specific room
    // const emitter = fromServer ? io : io.broadcast.to(msg.roomID);
    // const emitter = fromServer ? io : io.to(msg.roomID);
    const emitter = socket.broadcast.to(msg.roomID);
    emitter.emit('message', [msgToSend]);
  });
}

const stdin = process.openStdin();
stdin.addListener('data', (d) => {
  _sendAndSaveMessage({
    text: d.toString().trim(),
    createdAt: new Date(),
    user: { _id: 'Test From Server', name: 'ImServer', avatar: 'https://avatarfiles.alphacoders.com/113/11355.jpg' },
    roomID: '592d431956147ba212aef6c8592d42d656147ba212aef6c6',
  }, null /* no socket */, true /* send from server */, '592d431956147ba212aef6c0');
  // NOTE: Hard-coded server's userID
});
