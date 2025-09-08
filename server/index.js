const express = require("express");
const path = require("path");
const { createServer } = require("http");
const { Server } = require("socket.io");

const app = express();
const PORT = process.env.PORT || 8000;

// Serve React frontend
app.use(express.static(path.join(__dirname, "../client/build")));

// API example route
app.get("/api/test", (req, res) => {
  res.json({ message: "API is working!" });
});

// All other routes serve React app
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/build", "index.html"));
});

// Create HTTP server for Socket.io
const httpServer = createServer(app);

// Initialize Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Maps to track connections
const emailToSocketIdMap = new Map();
const socketIdToEmailMap = new Map();
const roomToPeersMap = new Map();

// Socket.io events
io.on("connection", (socket) => {
  console.log(`[SOCKET] Connected: ${socket.id}`);

  // User joins a room
  socket.on("room:join", ({ email, room }) => {
    emailToSocketIdMap.set(email, socket.id);
    socketIdToEmailMap.set(socket.id, email);
    socket.join(room);

    socket.data.room = room;
    socket.data.email = email;

    if (!roomToPeersMap.has(room)) roomToPeersMap.set(room, new Map());
    roomToPeersMap.get(room).set(socket.id, email);

    console.log(`[ROOM] ${email} joined ${room}`);

    // Send existing peers to the new user
    const existingPeers = Array.from(roomToPeersMap.get(room))
      .filter(([id]) => id !== socket.id)
      .map(([id, peerEmail]) => ({ id, email: peerEmail }));

    socket.emit("room:peers", { peers: existingPeers });

    // Notify others in room
    socket.to(room).emit("user:joined", { id: socket.id, email });
  });

  // Call offer
  socket.on("user:call", ({ to, offer }) => {
    const email = socketIdToEmailMap.get(socket.id);
    io.to(to).emit("incoming:call", { from: socket.id, offer, email });
  });

  // Call accepted
  socket.on("call:accepted", ({ to, ans }) => {
    const email = socketIdToEmailMap.get(socket.id);
    io.to(to).emit("call:accepted", { from: socket.id, ans, email });
  });

  // ICE candidates
  socket.on("ice-candidate", ({ to, candidate }) => {
    if (to && candidate) {
      const email = socketIdToEmailMap.get(socket.id);
      io.to(to).emit("ice-candidate", { from: socket.id, candidate, email });
    }
  });

  // Chat messages
  socket.on("chatMessage", (msg) => {
    const room = socket.data?.room;
    if (room) io.to(room).emit("chatMessage", msg);
    else io.emit("chatMessage", msg);
  });

  // Typing indicator
  socket.on("typing", (user) => {
    const room = socket.data?.room;
    if (room) socket.to(room).emit("typing", user);
  });

  // Hangup
  socket.on("call:hangup", ({ room, from }) => {
    const email = socketIdToEmailMap.get(socket.id);
    socket.to(room).emit("call:hangup", { from, email });
  });

  // Disconnect
  socket.on("disconnect", () => {
    const email = socketIdToEmailMap.get(socket.id);
    const room = socket.data?.room;

    emailToSocketIdMap.delete(email);
    socketIdToEmailMap.delete(socket.id);

    console.log(`[SOCKET] Disconnected: ${socket.id} (${email})`);

    if (room && roomToPeersMap.has(room)) {
      roomToPeersMap.get(room).delete(socket.id);
      socket.to(room).emit("call:hangup", { from: socket.id, email });
    }
  });
});

// Start server
httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
