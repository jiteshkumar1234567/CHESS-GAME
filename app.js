const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const path = require("path");
const { Chess } = require("chess.js");

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const chess = new Chess();
let players = {
  white: null,
  black: null,
  scores: { w: 0, b: 0 }
};

app.set("view engine", "ejs");
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

  socket.emit("boardState", { fen: chess.fen(), scores: players.scores });

  socket.on("move", move => {
    try {
      if (chess.turn() === "w" && socket.id !== players.white) return;
      if (chess.turn() === "b" && socket.id !== players.black) return;

      const result = chess.move(move);

      if (result) {
        // Score for captured piece
        if (result.captured) {
          const pieceValue = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
          const scorer = chess.turn() === "b" ? "w" : "b";
          players.scores[scorer] += pieceValue[result.captured];
        }

        io.emit("boardState", { fen: chess.fen(), scores: players.scores });
      }
    } catch (err) {
      console.log("Invalid move");
    }
  });

  socket.on("reset", () => {
    chess.reset();
    players.scores = { w: 0, b: 0 };
    io.emit("boardState", { fen: chess.fen(), scores: players.scores });
  });

  socket.on("disconnect", () => {
    if (socket.id === players.white) delete players.white;
    if (socket.id === players.black) delete players.black;
  });
});

server.listen(3000, () => console.log("🔥 Server running on port 3000"));
