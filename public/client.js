const socket = io();

    function createRoom() {
        const roomName = document.getElementById('createRoomInput').value;
        socket.emit('createRoom', roomName);
    }
  
    function joinRoom() {
    const roomName = document.getElementById('joinRoomInput').value;
    socket.emit('joinRoom', roomName);
    }

    socket.on('availableRooms', (availableRooms) => {
    const roomList = document.getElementById('roomList');
    roomList.innerHTML = '';
    
        availableRooms.forEach((room) => {
            updateRoomList(room.name);
        });
    });

    socket.on('roomURL', (url) => { 
        
        // Exibir tela de loading
        showLoadingScreen();
        
        // Redirecionar para o novo servidor após um pequeno atraso
        setTimeout(() => {            
            window.location.href = url;
        }, 4000); // Tempo de espera de 4 segundos (ajuste conforme necessário)
      });

    socket.on('roomCreated', (roomName) => {
    console.log(`Sala criada: ${roomName}`);
    updateRoomList(roomName);
    });

    socket.on('roomJoined', (roomName) => {
    console.log(`Entrou na sala: ${roomName}`);
    });

    socket.on('roomExists', (roomName) => {
    console.log(`Sala já existe: ${roomName}`);
    alert(`A sala '${roomName}' já existe. Por favor, escolha outro nome.`);
    });

    socket.on('roomNotExist', (roomName) => {
    console.log(`Sala inexistente: ${roomName}`);
    alert(`A sala '${roomName}' não existe. Por favor, tente novamente.`);
    });

    // Recebe as informações das salas existentes
    socket.on('existingRooms', (rooms) => {
        displayRooms(rooms);
    });

    function updateRoomList(roomName) {
    const roomList = document.getElementById('roomList');
    const listItem = document.createElement('li');
    listItem.textContent = roomName;
    roomList.appendChild(listItem);
    }

    // Função para exibir as salas para o cliente
    function displayRooms(rooms) {
    // Limpa a lista de salas existentes
    const roomsList = document.getElementById('roomList');
    roomsList.innerHTML = '';
  
    // Cria os elementos HTML para exibir as salas
    rooms.forEach((room) => {
      const roomItem = document.createElement('li');
      const roomLink = document.createElement('a');
      roomLink.addEventListener('click', ()=>{
        socket.emit('deleteRoomFromList', room);
        window.location.href = room.url;
      });
      roomLink.textContent = room.name;
      roomLink.classList.add('clickable-link');
  
      roomItem.appendChild(roomLink);
      roomsList.appendChild(roomItem);
    });
  }  

  function showLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    loadingScreen.style.display = 'block';
  }