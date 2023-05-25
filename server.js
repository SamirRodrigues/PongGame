const express = require("express");
const http = require("http");
const socketIO = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const PORT = 3000;

const MAX_PLAYERS = 2;    // Número máximo de jogadores permitidos
const MAX_SCORE = 5;      // Pontuação máxima para vencer o jogo

// Variáveis do jogo
let waitingPlayers = [];  // Sala de espera de jogadores
let players = {};
const ball = {
  x: 400,
  y: 300,
  speedX: Math.random() > 0.5 ? 3 : -3,
  speedY: Math.random() > 0.5 ? 3 : -3,
};

// Configuração do servidor
app.use(express.static(__dirname + "/public"));

// Inicia o servidor
server.listen(PORT, () => {
  console.log(`Servidor iniciado na porta ${PORT}`);
});

// Manipulador de eventos de conexão
io.on("connection", (socket) => {
  console.log("Novo jogador conectado:", socket.id);

  if (Object.keys(players).length >= MAX_PLAYERS) {                             // Se o número máximo de jogadores já foi alcançado, recusa a conexão do novo jogador

    console.log(
      "Número máximo de jogadores alcançado. Conexão recusada:",
      socket.id
    );
    socket.emit("gameFull", "O jogo está cheio. Tente novamente mais tarde.");  // TODO: Tela informando que o jogo está cheio
    socket.disconnect(true);
    return;
  }
  
  waitingPlayers.push(socket); // Adiciona jogador à sala de espera

  // Verifica se há dois jogadores na sala de espera para iniciar o jogo
  if (waitingPlayers.length === 2) {
    startGame(); //Inicia o Gameloop
  }

  // Adiciona novo jogador
  players[socket.id] = {
    id: socket.id,                                                  // Adiciona uma propriedade id única para cada jogador
    x: Object.keys(players).length % 2 === 0 ? 10 : 780,            // Define o lado do jogador, posição inicial da raquete no eixo X
    y: 250,                                                         // posição inicial da raquete no eixo Y
    width: 10,                                                      // Largura
    height: 60,                                                     // Altura
    score: 0,                                                       // Pontuação
    side: Object.keys(players).length % 2 === 0 ? "left" : "right", // Define o lado do jogador
  };

  // Envia informações iniciais para o cliente da bola e da raquete
  socket.emit("initialState", { players, ball });

  // Manipulador de eventos de movimento da raquete
  socket.on("move", (direction) => {
    const player = players[socket.id];   // Coleta o player especifico da lista de players
    const speed = 10;                     // Quantidade de px que irá se deslocar por frame

    // Move a raquete para cima ou para baixo
    if (direction === "up") {
      player.y -= speed;
    } else if (direction === "down") {
      player.y += speed;
    }

    // Limita o movimento da raquete dentro dos limites do campo
    if (player.y < 0) {
      player.y = 0;
    } else if (player.y + player.height > 600) {
      player.y = 600 - player.height;
    }
  });

  // Manipulador de eventos de desconexão
  socket.on("disconnect", () => {
    console.log("Jogador desconectado:", socket.id);
    delete players[socket.id];

    // Remove jogador da sala de espera
    const index = waitingPlayers.indexOf(socket);
    if (index !== -1) {
      waitingPlayers.splice(index, 1);
    }
  });
});

// ==================== LÓGICA DO JOGO ==================== //

// Função para atualizar o estado do jogo
function updateGameState() {
  // Movimenta a bola
  ball.x += ball.speedX;
  ball.y += ball.speedY;

  // Colisão com as paredes
  if (ball.y < 0 || ball.y > 590) {
    ball.speedY *= -1;
  }

  // Colisão com as raquetes
  for (const playerID in players) {
     
      const player = players[playerID];

      if (player.side === "left") {
        if (
          ball.x <= player.x + player.width &&
          ball.y <= player.y + player.height &&
          ball.y + 10 >= player.y
        ) {
          ball.speedX *= -1.2;
        }
      } else {
        if (
          ball.x >= player.x - player.width &&
          ball.y <= player.y + player.height &&
          ball.y + 10 >= player.y
        ) {
          ball.speedX *= -1.2;
        }
      }    
  }

  // Verifica se a bola saiu do campo
  if (ball.x < 0) {
    // Ponto para o jogador da direita
    Object.values(players).forEach((player) => {
      if (player.side === "right") {
        player.score++; 
      }
    });

    resetBall();
  } else if (ball.x > 800) {
    // Ponto para o jogador da esquerda
    Object.values(players).forEach((player) => {
      if (player.side === "left") {
        player.score++;
      }
    });

    resetBall();
  }
}

// Função para resetar a posição da bola
function resetBall() {
  ball.x = 400;
  ball.y = 300;
  ball.speedX = Math.random() > 0.5 ? 3 : -3;
  ball.speedY = Math.random() > 0.5 ? 3 : -3;
}

// ==================== GAME OVER ==================== //

// Função para resetar o jogo
function resetGame() {
  players = {};         // Reinicia os jogadores
  resetBall();          // Reinicia a bola
  waitingPlayers = [];  // Remove todos os jogadores da lista de espera

  // Envia o estado inicial para os clientes
  io.sockets.emit("initialState", { players, ball });

  // Emite um evento de reinício do jogo
  io.sockets.emit("restartGame");
}

// Função para verificar se há um vencedor
function checkForWinner() {
  const playerIDs = Object.keys(players);

  for (const playerID of playerIDs) {
    const player = players[playerID];

    if (player.score >= MAX_SCORE) {
      return player.side; // Retorna o jogador vencedor
    }
  }

  return null; // Nenhum jogador atingiu a pontuação máxima ainda
}

function startGame() {
  console.log("Iniciando jogo...");

  // TODO: Cooldown ?

  // intervalID = Toda função setInterval retorna um ID que pode ser armazenado e usado para dar clear posteriormente
  // Nesse caso, armazeno para que após o termino do jogo, ou qualquer desconexão aconteça, o jogo seja parado automaticamente.

  // Atualiza o estado do jogo em intervalos regulares
  var intervalID = setInterval(() => {
    if (Object.keys(players).length < MAX_PLAYERS) {
      // Se um jogador for desconectado após o inicio do jogo
      clearInterval(intervalID); // Para o update
      resetGame(); // Reseta o jogo
    }

    updateGameState(); // Chame o Gameloop

    io.sockets.emit("gameState", { players, ball }); // Atualiza todos os jogadores sobre o estado do jogo

    const winner = checkForWinner();
    if (winner) {
      io.sockets.emit("gameOver", { winner });
      resetGame();
      clearInterval(intervalID); //Para o Update caso o jogo termine
    }
  }, 1000 / 60); //60FPS
}