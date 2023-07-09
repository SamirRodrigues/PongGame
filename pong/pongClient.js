const canvas = document.getElementById("gameCanvas");
const context = canvas.getContext("2d");
const socket = io();

let showWinner = false;
let winnerSide = "";

let players = {};
let ball = {};

socket.on("initialState", (initialState) => {
  players = initialState.players;
  ball = initialState.ball;
});

socket.on("gameState", (gameState) => {
  players = gameState.players;
  ball = gameState.ball;
});

socket.on("gameOver", ({ winner }) => {
  showWinner = true;    // Ativa a exibição da tela de vencedor
  winnerSide = winner;  // Armazena o lado do jogador vencedor
  showWinnerScreen();
});

socket.on("restartGame", () => {
  // Reinicia o jogo
  resetGame();
});

function draw() {
  if (showWinner) {
    showWinnerScreen();
    return;
  }

  // Limpa o canvas
  context.clearRect(0, 0, canvas.width, canvas.height);

  // Desenha a bola
  context.fillStyle = "white";
  context.fillRect(ball.x, ball.y, 10, 10);

  // Desenha a linha tracejada representando a rede
  context.strokeStyle = "white";
  context.setLineDash([5, 5]);                      // Define o padrão de linha tracejada (5 pixels desenhados, 5 pixels vazios)
  context.beginPath();
  context.moveTo(canvas.width / 2, 0);              // Começa na metade superior do canvas
  context.lineTo(canvas.width / 2, canvas.height);  // Termina na metade inferior do canvas
  context.stroke();
  context.setLineDash([]);                          // Restaura o padrão de linha contínua

  // Desenha as raquetes
  for (const playerID in players) {
    if (players.hasOwnProperty(playerID)) {
      const player = players[playerID];

      context.fillStyle = "white";
      context.fillRect(player.x, player.y, player.width, player.height);

      // Desenha a pontuação do jogador
      if (player.side === "right") {
        context.font = "20px Arial";
        context.fillText(`Pontuação: ${player.score}`, 670, 20);
      } else {
        context.font = "20px Arial";
        context.fillText(`Pontuação: ${player.score}`, 10, 20);
      }
    }
  }

  requestAnimationFrame(draw);
}

draw();

function showWinnerScreen() {
  context.fillStyle = "black";
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = "white";
  context.font = "40px Arial";
  context.textAlign = "center";
  context.fillText("Jogador Vencedor", canvas.width / 2, canvas.height / 2);
  context.fillText(
    `Lado do Jogador: ${winnerSide}`,
    canvas.width / 2,
    canvas.height / 2 + 40
  );

  // Exibe um botão para reiniciar o jogo
  context.font = "20px Arial";
  context.fillText(
    "Aperte qualquer tecla para reiniciar",
    canvas.width / 2,
    canvas.height / 2 + 100
  );
}

function resetGame() {
  // Limpa o canvas
  context.clearRect(0, 0, canvas.width, canvas.height);
  // Inicia a renderização novamente
  draw();
}

document.addEventListener("keydown", (event) => {
  if (showWinner) {
    showWinner = false;         // Desativa a exibição da tela de vencedor
    socket.emit("restartGame"); // Solicita o reinício do jogo ao servidor
    location.reload();          // Recarrega a página
  }
});

// Eventos de input do jogador
document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowUp") {
    socket.emit("move", "up");
  } else if (event.key === "ArrowDown") {
    socket.emit("move", "down");
  }
});