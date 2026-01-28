const socket = io();
const chess = new Chess();

const boardElement = document.querySelector(".chessboard");
const statusDiv = document.getElementById("status");

let playerRole = null;
let draggedFrom = null;

const pieces = {
  p:"♟", r:"♜", n:"♞", b:"♝", q:"♛", k:"♚",
  P:"♙", R:"♖", N:"♘", B:"♗", Q:"♕", K:"♔"
};

socket.on("playerRole", role => {
  playerRole = role;
  updateStatus();
});

socket.on("spectator", () => {
  statusDiv.innerText = "👀 You are Spectator";
});

socket.on("boardState", data => {
  chess.load(data.fen);
  renderBoard();
  updateStatus(data.scores);
});

function renderBoard() {
  boardElement.innerHTML = "";

  chess.board().forEach((row, r) => {
    row.forEach((square, c) => {
      const sq = document.createElement("div");
      sq.className = `
        w-16 h-16 flex items-center justify-center text-4xl
        ${(r + c) % 2 ? "bg-green-700" : "bg-green-300"}
      `;

      sq.addEventListener("dragover", e => e.preventDefault());

      sq.addEventListener("drop", () => {
        if (!draggedFrom) return;

        socket.emit("move", {
          from: draggedFrom,
          to: toSquare(r, c),
          promotion: "q"
        });

        draggedFrom = null;
      });

      if (square) {
        const piece = document.createElement("div");
        piece.innerText = pieces[
          square.color === "w" ? square.type.toUpperCase() : square.type
        ];

        const canMove =
          playerRole === square.color &&
          chess.turn() === playerRole;

        piece.draggable = canMove;

        piece.className = `
          select-none cursor-pointer
          ${square.color === "w"
            ? "text-white drop-shadow-[0_0_6px_white]"
            : "text-black drop-shadow-[0_0_6px_black]"}
        `;

        piece.addEventListener("dragstart", () => {
          if (canMove) draggedFrom = toSquare(r, c);
        });

        sq.appendChild(piece);
      }

      boardElement.appendChild(sq);
    });
  });
}

function updateStatus(scores = { w: 0, b: 0 }) {
  if (!playerRole) return;

  const roleText = playerRole === "w" ? "You are White ♔" : "You are Black ♚";
  const turnText = chess.turn() === playerRole ? "🟢 Your Turn" : "🔴 Opponent Turn";

  const scoreText = `Score - You: ${scores[playerRole]} | Opponent: ${scores[playerRole === "w" ? "b" : "w"]}`;

  statusDiv.innerText = `${roleText} | ${turnText}\n${scoreText}`;

  // Check / Checkmate / Draw Alerts
  if (chess.in_checkmate()) {
    const winner = chess.turn() === "w" ? "Black" : "White";
    alert(`🏆 CHECKMATE! ${winner} wins!`);
  } else if (chess.in_check()) {
    statusDiv.innerText += " | ⚠️ CHECK!";
  } else if (chess.in_draw()) {
    alert("🤝 DRAW!");
  }
}

function toSquare(r, c) {
  return "abcdefgh"[c] + (8 - r);
}

function resetGame() {
  socket.emit("reset");
}
