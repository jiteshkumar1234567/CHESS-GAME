// ✅ dotenv load (TOP PE ZAROORI)
require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const { Chess } = require("chess.js");

const app = express();
const server = http.createServer(app);

// ✅ socket.io FIX
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const chess = new Chess();

let players = {
  white: null,
  black: null,
  scores: { w: 0, b: 0 }
};

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.render("index");
});

io.on("connection", socket => {
  console.log("User connected:", socket.id);

  if (!players.white) {
    players.white = socket.id;
    socket.emit("playerRole", "w");
  } else if (!players.black) {
    players.black = socket.id;
    socket.emit("playerRole", "b");
  } else {
    socket.emit("spectator");
  }

  socket.emit("boardState", {
    fen: chess.fen(),
    scores: players.scores
  });

  socket.on("move", move => {
    try {
      if (chess.turn() === "w" && socket.id !== players.white) return;
      if (chess.turn() === "b" && socket.id !== players.black) return;

      const result = chess.move(move);

      if (result) {
        if (result.captured) {
          const pieceValue = { p:1, n:3, b:3, r:5, q:9 };
          const scorer = chess.turn() === "b" ? "w" : "b";
          players.scores[scorer] += pieceValue[result.captured] || 0;
        }

        io.emit("boardState", {
          fen: chess.fen(),
          scores: players.scores
        });
      }
    } catch (err) {
      console.log("Invalid move");
    }
  });

  socket.on("reset", () => {
    chess.reset();
    players.scores = { w: 0, b: 0 };
    io.emit("boardState", {
      fen: chess.fen(),
      scores: players.scores
    });
  });

  socket.on("disconnect", () => {
    if (socket.id === players.white) players.white = null;
    if (socket.id === players.black) players.black = null;
  });
});

// ✅ PORT from .env / Render
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
