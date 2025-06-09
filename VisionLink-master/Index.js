const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const { ExpressPeerServer } = require('peer');
const { v4: uuidV4 } = require('uuid');

// Setup PeerJS
const peerServer = ExpressPeerServer(server, {
  debug: true
});
app.use('/peerjs', peerServer);

// Set view engine and public directory
app.set('view engine', 'ejs');
app.use(express.static('public'));

// Default route redirects to a unique room
app.get('/', (req, res) => {
  res.redirect(`/${uuidV4()}`);
});

// Room route
app.get('/:room', (req, res) => {
  res.render('room', { roomId: req.params.room });
});

// WebSocket logic
io.on('connection', socket => {
  socket.on('join-room', (roomId, userId) => {
    socket.join(roomId);
    socket.to(roomId).broadcast.emit('user-connected', userId);

    // Chat messages
    socket.on('message', message => {
      io.to(roomId).emit('createMessage', message);
    });

    // Disconnection
    socket.on('disconnect', () => {
      socket.to(roomId).broadcast.emit('user-disconnected', userId);
    });
  });
});

// Start server
const PORT = process.env.PORT || 3030;
server.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
