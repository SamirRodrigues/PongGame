const express = require("express");
const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server);
const path = require('path');
const { exec } = require('child_process');


// Roteamento do servidor
app.use(express.static(__dirname + "/public"));

// Armazena os nomes das salas existentes
const existingRooms = new Set();

// Array para armazenar as salas criadas
let rooms = [];

// Envia informações das salas existentes para um novo cliente
function sendExistingRooms(socket) {
    socket.emit('existingRooms', rooms);
  }

// Lida com a conexão de um novo cliente
io.on("connection", (socket) => {
console.log(`Novo cliente conectado: ${socket.id}`);

// Envia informações das salas existentes para o novo cliente
sendExistingRooms(socket);


const getUniquePort = () => {
    // Gera um número de porta aleatório entre 3001 e 60000
    const minPort = 3001;
    const maxPort = 60000;
    const port = Math.floor(Math.random() * (maxPort - minPort + 1)) + minPort;
  
    // Verifica se o número de porta está em uso
    return new Promise((resolve, reject) => {
      const server = require('http').createServer();
      server.listen(port, () => {
        server.close(() => {
          resolve(port);
        });
      });
      server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          // Porta está em uso, tenta outra porta
          resolve(getUniquePort().catch(reject));
        } else {
          reject(err);
        }
      });
    });
  };


// Cria uma nova sala
socket.on('createRoom', async (roomName) => {    

    if (rooms.some((room) => room.name === roomName)) {
      console.log(`Sala já existe: ${roomName}`);
      socket.emit('roomExists', roomName);
    } else {        
      
      // Gera uma porta única para a sala
      const port = await getUniquePort();
      console.log(`PORT: ${port}`);
      

      socket.join(roomName);
      
      console.log(`Cliente criou a sala: ${roomName}`);

      const newServer = exec(`node pongServer.js`, {
        env: {
          ROOM_NAME: roomName,
          PORT: port
        }
      });
      // Envia a URL da sala para o cliente
      let roomURL = `http://localhost:${port}`;
      console.log(roomURL)
      const newRoom = { name: roomName, url: roomURL, clients: 1, port: port };
      rooms.push(newRoom);
      socket.emit('roomURL', roomURL);  
    }
  });

// Envia as salas disponíveis para um novo cliente
socket.on('getRooms', () => {
    socket.emit('availableRooms', rooms);
  });

  // Entra em uma sala existente
  socket.on("joinRoom", (roomName) => {
    if (io.sockets.adapter.rooms.has(roomName)) {
      socket.join(roomName);
      console.log(`Cliente entrou na sala: ${roomName}`);
      io.to(roomName).emit("roomJoined", roomName);
    } else {
      console.log(`Sala inexistente: ${roomName}`);
      socket.emit("roomNotExist", roomName);
    }
  });

  socket.on("deleteRoomFromList", (room) =>{    
    rooms = rooms.filter((r) => r.name !== room.name);
  })

  // Lida com a desconexão de um cliente
  socket.on('disconnect', () => {
    // Remove a sala da lista de salas existentes quando todos os clientes se desconectarem dela
    const rooms = Object.keys(socket.rooms);
    for (const room of rooms) {
      if (room !== socket.id) {
        const clientsInRoom = io.sockets.adapter.rooms.get(room);
        if (!clientsInRoom || clientsInRoom.size === 0) {
          existingRooms.delete(room);
          console.log(`Sala removida: ${room}`);
        }
      }
    }
  });
});

// Inicia o servidor
const port = 3000;
server.listen(port, () => {
  console.log(`Servidor iniciado na porta ${port}`);
});

//ROTAS

app.get('/:roomName', (req, res) => {
    const roomName = req.params.roomName;
  
    // Verifica se a sala existe
    if (rooms.some((room) => room.name === roomName)) {
      res.sendFile(path.join(__dirname + '/pong'));
    } else {
      res.status(404).send('Sala não encontrada');
    }
  });
