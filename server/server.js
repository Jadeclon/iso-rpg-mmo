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
const dogs = {};
const droppedItems = {};
const itemsDef = require('../client/src/items.json');
let trader = {
    id: 'trader-1',
    position: { x: (Math.random() * 40) - 20, z: (Math.random() * 40) - 20 }, // Random spawn
    anchorPosition: null, // Set after init
    width: 1, // Collision size
    rotation: [0, 0, 0],
    items: ['potion', 'sword'],
    wanderTarget: null,
    nextWanderTime: Date.now() + 5000
};
trader.anchorPosition = { ...trader.position };

// Initialize Dogs (Server Logic replicated from levelData.js)
const initDogs = () => {
    // Helper to check if in river
    const getRiverX = (z) => Math.sin(z * 0.05) * 20 + Math.sin(z * 0.1) * 10;
    const isPositionInRiver = (x, z) => {
        const riverX = getRiverX(z);
        return Math.abs(x - riverX) < 8.0; 
    };

    let dogIdCount = 0;
    
    // Create 5 tribes
    for (let tribe = 0; tribe < 5; tribe++) {
        // Find a valid center for the tribe
        let tribeX, tribeZ;
        let validSpot = false;
        
        // Try to find a valid spot
        for(let attempt = 0; attempt < 10; attempt++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 15 + Math.random() * 25; // 15 to 40 radius
            tribeX = Math.sin(angle) * dist;
            tribeZ = Math.cos(angle) * dist;
            
            if (!isPositionInRiver(tribeX, tribeZ)) {
                validSpot = true;
                break;
            }
        }
        
        if (!validSpot) continue; // Skip this tribe if can't find spot
        
        // Spawn 3 dogs around this center
        for (let i = 0; i < 3; i++) {
            const offsetX = (Math.random() - 0.5) * 4; // Spread within 4 units
            const offsetZ = (Math.random() - 0.5) * 4;
            
            const position = { x: tribeX + offsetX, y: 0, z: tribeZ + offsetZ };
            const id = `dog-${dogIdCount}`;
            dogs[id] = {
                id: id,
                position: position,
                anchorPosition: { ...position },
                rotation: [0, Math.random() * Math.PI * 2, 0],
                hp: 100,
                maxHp: 100,
                state: 'idle', 
                target: null,
                tribeId: tribe,
                wanderTarget: null,
                nextWanderTime: Date.now() + Math.random() * 5000
            };
            dogIdCount++;
        }
    }
};

initDogs();

// Game Loop for dogs
setInterval(() => {
    let hasUpdates = false;
    const now = Date.now();

    Object.values(dogs).forEach(dog => {
        if (dog.state === 'angry' && dog.target && players[dog.target]) {
            const player = players[dog.target];
            // Simple chase logic
            const dx = player.position[0] - dog.position.x;
            const dz = player.position[2] - dog.position.z;
            const dist = Math.sqrt(dx*dx + dz*dz);
            
            if (dist > 20) {
                // Too far, give up
                dog.state = 'idle';
                dog.target = null;
                hasUpdates = true;
                io.emit('dogUpdate', dog);
            } else if (dist > 1.5) { // Stop if close enough
                const speed = 0.22; // Faster when angry (was 0.15)
                dog.position.x += (dx / dist) * speed;
                dog.position.z += (dz / dist) * speed;
                
                // Update rotation to face target
                dog.rotation[1] = Math.atan2(dx, dz);
                hasUpdates = true;
            } else {
                // Attack Player
                if (!dog.lastAttack || now - dog.lastAttack > 2000) { // Attack every 2 seconds
                    player.hp -= 10;
                    dog.lastAttack = now;
                    io.emit('dogBark', dog.id);
                    
                    if (player.hp <= 0) {
                        // Respawn
                        player.hp = 100;
                        player.position = [0, 0, 0];
                        
                        // Clear aggro from ALL dogs targeting this player
                        Object.values(dogs).forEach(d => {
                            if (d.target === player.id) {
                                d.target = null;
                                d.state = 'idle';
                                io.emit('dogUpdate', d); // Force update to client
                            }
                        });
                        
                        hasUpdates = true; // Dog state changed
                        
                        io.emit('playerRespawn', player);
                    } else {
                        io.emit('playerUpdate', player);
                    }
                }
            }
        } else if (dog.state === 'angry' && (!dog.target || !players[dog.target])) {
            // Target lost/disconnected
            dog.state = 'idle';
            dog.target = null;
            hasUpdates = true;
        } else if (dog.state === 'idle') {
            // Idle Wandering Logic
            if (dog.wanderTarget) {
                // Move towards wander target
                const dx = dog.wanderTarget.x - dog.position.x;
                const dz = dog.wanderTarget.z - dog.position.z;
                const dist = Math.sqrt(dx*dx + dz*dz);
                
                if (dist < 0.2) {
                    // Reached target
                    dog.wanderTarget = null;
                    dog.nextWanderTime = now + 2000 + Math.random() * 3000; // Wait 2-5s
                } else {
                    const speed = 0.05; // Slow walk
                    dog.position.x += (dx / dist) * speed;
                    dog.position.z += (dz / dist) * speed;
                    dog.rotation[1] = Math.atan2(dx, dz);
                    hasUpdates = true; 
                }
            } else {
                // Pick new target if time
                if (now > dog.nextWanderTime) {
                    const radius = 5;
                    const angle = Math.random() * Math.PI * 2;
                    const dist = Math.random() * radius;
                    
                    dog.wanderTarget = {
                        x: dog.anchorPosition.x + Math.sin(angle) * dist,
                        z: dog.anchorPosition.z + Math.cos(angle) * dist
                    };
                }
            }
        }
    });

    if (hasUpdates) {
        io.emit('dogsMoved', dogs);
    }
    
    // Trader Logic
    if (trader) {
        let traderUpdated = false;
        if (trader.wanderTarget) {
             const dx = trader.wanderTarget.x - trader.position.x;
             const dz = trader.wanderTarget.z - trader.position.z;
             const dist = Math.sqrt(dx*dx + dz*dz);
             
             if (dist < 0.1) {
                 trader.wanderTarget = null;
                 trader.nextWanderTime = now + 4000 + Math.random() * 4000;
                 traderUpdated = true;
             } else {
                 const speed = 0.08; // Leisurely pace
                 trader.position.x += (dx / dist) * speed;
                 trader.position.z += (dz / dist) * speed;
                 trader.rotation[1] = Math.atan2(dx, dz);
                 traderUpdated = true;
             }
        } else if (now > trader.nextWanderTime) {
             const radius = 3;
             const angle = Math.random() * Math.PI * 2;
             const dist = Math.random() * radius;
             trader.wanderTarget = {
                 x: trader.anchorPosition.x + Math.sin(angle) * dist,
                 z: trader.anchorPosition.z + Math.cos(angle) * dist
             };
        }
        
        if (traderUpdated) {
            io.emit('traderUpdate', trader);
        }
    }
}, 100); // 10 ticks per second

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Initialize new player
  players[socket.id] = {
    id: socket.id,
    position: [0, 0, 0], // x, y, z
    color: '#' + Math.floor(Math.random()*16777215).toString(16),
    hp: 100,
    maxHp: 100
  };

  // Send current players and dogs to new player
  socket.emit('currentPlayers', players);
  socket.emit('currentDogs', dogs);
  socket.emit('currentItems', droppedItems);
  socket.emit('traderUpdate', trader);

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

  socket.on('skinUpdate', (skinId) => {
      if (players[socket.id]) {
          players[socket.id].skin = skinId;
          io.emit('playerUpdate', players[socket.id]);
      }
  });

  socket.on('playerAttack', () => {
      if (players[socket.id]) {
          players[socket.id].lastAttack = Date.now();
          io.emit('playerUpdate', players[socket.id]);
      }
  });

  socket.on('attackDog', (dogId) => {
      const dog = dogs[dogId];
      if (dog) {
          dog.hp -= 20; // 5 hits to kill
          
          // Aggro Logic (Tribe)
          if (dog.state !== 'angry') {
             const tribeId = dog.tribeId;
             const target = socket.id;

             // Aggro entire tribe
             Object.values(dogs).forEach(d => {
                 if (d.tribeId === tribeId) {
                     d.state = 'angry';
                     d.target = target;
                     io.emit('dogUpdate', d);
                 }
             });
          }

          if (dog.hp <= 0) {
              const position = { ...dog.position }; // Capture position before delete
              delete dogs[dogId];
              io.emit('dogKilled', dogId);
              
              // Item Drop Logic
              itemsDef.forEach(item => {
                  if (Math.random() < item.dropRate) {
                      const id = `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                      const drop = {
                          id: id,
                          itemId: item.id,
                          position: {
                              x: position.x + (Math.random() - 0.5), 
                              z: position.z + (Math.random() - 0.5)
                          },
                          image: item.image
                      };
                      droppedItems[id] = drop;
                      io.emit('itemDropped', drop);
                  }
              });
          } else {
              io.emit('dogUpdate', dog);
          }
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
      // Pickup Item
  socket.on('pickupItem', (itemId) => {
      const item = droppedItems[itemId];
      if (item && players[socket.id]) {
          const p = players[socket.id];
          const dx = p.position[0] - item.position.x;
          const dz = p.position[2] - item.position.z;
          const dist = Math.sqrt(dx*dx + dz*dz);
          
          if (dist < 2.0) { // Pickup range
              delete droppedItems[itemId];
              io.emit('itemRemoved', itemId);
              socket.emit('inventoryAdd', item);
          }
      }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    delete players[socket.id];
    io.emit('playerDisconnected', socket.id);
    
    // Clear dog aggro if target disconnects
    Object.values(dogs).forEach(dog => {
        if (dog.target === socket.id) {
            dog.target = null;
            dog.state = 'idle';
            io.emit('dogUpdate', dog);
        }
    });
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
