const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins for dev
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3002;

// Game State
const players = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Initialize new player
  players[socket.id] = {
    id: socket.id,
    position: [0, 0, 0], // x, y, z
    color: '#' + Math.floor(Math.random()*16777215).toString(16)
  };

  // Send current players to new player
  socket.emit('currentPlayers', players);

  // Broadcast new player to others
  socket.broadcast.emit('newPlayer', players[socket.id]);

  // Handle movement
  socket.on('playerMove', (position) => {
    if (players[socket.id]) {
        players[socket.id].position = position;
        socket.broadcast.emit('playerMoved', {
            id: socket.id,
            position: position
        });
    }
  });

  socket.on('chatMessage', (text) => {
      if (players[socket.id]) {
        io.emit('chatMessage', {
            sender: socket.id.substr(0, 4), // Short ID
            text: text,
            color: players[socket.id].color
        });
      }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    delete players[socket.id];
    io.emit('playerDisconnected', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
