require('dotenv').config();
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
const bears = {};
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

// Helper to check if in river
const getRiverX = (z) => Math.sin(z * 0.05) * 20 + Math.sin(z * 0.1) * 10;
const isPositionInRiver = (x, z) => {
    const riverX = getRiverX(z);
    return Math.abs(x - riverX) < 8.0; 
};

const spawnTribe = (tribe) => {
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
    
    if (!validSpot) return; // Skip this tribe if can't find spot
    
    // Spawn 3 dogs around this center
    for (let i = 0; i < 3; i++) {
        const offsetX = (Math.random() - 0.5) * 4; // Spread within 4 units
        const offsetZ = (Math.random() - 0.5) * 4;
        
        const position = { x: tribeX + offsetX, y: 0, z: tribeZ + offsetZ };
        const id = `dog-tribe${tribe}-${Date.now()}-${i}`; // Unique ID
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
    }
    // Broadcast updates so clients see new dogs
    io.emit('dogsMoved', dogs); 
};

// Initialize Dogs (Server Logic replicated from levelData.js)
const initDogs = () => {
    // Create 5 tribes
    const numTribes = process.env.TRIBES || 5;
    for (let tribe = 0; tribe < numTribes; tribe++) {
        spawnTribe(tribe);
    }
};

initDogs();

const spawnBearTribe = (tribe) => {
    let tribeX, tribeZ;
    let validSpot = false;
    
    for(let attempt = 0; attempt < 10; attempt++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 15 + Math.random() * 25;
        tribeX = Math.sin(angle) * dist;
        tribeZ = Math.cos(angle) * dist;
        
        if (!isPositionInRiver(tribeX, tribeZ)) {
            validSpot = true;
            break;
        }
    }
    
    if (!validSpot) return;
    
    for (let i = 0; i < 2; i++) {
        const offsetX = (Math.random() - 0.5) * 4;
        const offsetZ = (Math.random() - 0.5) * 4;
        
        const position = { x: tribeX + offsetX, y: 0, z: tribeZ + offsetZ };
        const id = `bear-tribe${tribe}-${Date.now()}-${i}`;
        bears[id] = {
            id: id,
            position: position,
            anchorPosition: { ...position },
            rotation: [0, Math.random() * Math.PI * 2, 0],
            hp: 200,
            maxHp: 200,
            state: 'idle', 
            target: null,
            tribeId: tribe,
            wanderTarget: null,
            nextWanderTime: Date.now() + Math.random() * 5000
        };
    }
    io.emit('bearsMoved', bears); 
};

const initBears = () => {
    for (let tribe = 0; tribe < 3; tribe++) {
        spawnBearTribe(tribe);
    }
};

initBears();

// Game Loop for dogs
setInterval(() => {
    const changedDogs = {};
    const changedBears = {};
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
                changedDogs[dog.id] = dog;
                io.emit('dogUpdate', dog);
            } else if (dist > 1.5) { // Stop if close enough
                const speed = 0.44; // Adjusted for 5Hz (0.22 * 2)
                dog.position.x += (dx / dist) * speed;
                dog.position.z += (dz / dist) * speed;
                
                // Update rotation to face target
                dog.rotation[1] = Math.atan2(dx, dz);
                changedDogs[dog.id] = dog;
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
            changedDogs[dog.id] = dog;
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
                    const speed = 0.1; // Adjusted for 5Hz (0.05 * 2)
                    dog.position.x += (dx / dist) * speed;
                    dog.position.z += (dz / dist) * speed;
                    dog.rotation[1] = Math.atan2(dx, dz);
                    changedDogs[dog.id] = dog; 
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

    if (Object.keys(changedDogs).length > 0) {
        io.emit('dogsMoved', changedDogs);
    }

    Object.values(bears).forEach(bear => {
        if (bear.state === 'angry' && bear.target && players[bear.target]) {
            const player = players[bear.target];
            const dx = player.position[0] - bear.position.x;
            const dz = player.position[2] - bear.position.z;
            const dist = Math.sqrt(dx*dx + dz*dz);
            
            if (dist > 20) {
                bear.state = 'idle';
                bear.target = null;
                changedBears[bear.id] = bear;
                io.emit('bearUpdate', bear);
            } else if (dist > 2.0) { // Bigger range for bear
                const speed = 0.38; // Slower than dog
                bear.position.x += (dx / dist) * speed;
                bear.position.z += (dz / dist) * speed;
                
                bear.rotation[1] = Math.atan2(dx, dz);
                changedBears[bear.id] = bear;
            } else {
                if (!bear.lastAttack || now - bear.lastAttack > 2500) { // Slower attack
                    player.hp -= 25; // More damage
                    bear.lastAttack = now;
                    io.emit('bearBark', bear.id); // Re-use bark sound for now or add roar?
                    
                    if (player.hp <= 0) {
                        player.hp = 100;
                        player.position = [0, 0, 0];
                        
                        Object.values(bears).forEach(b => {
                            if (b.target === player.id) {
                                b.target = null;
                                b.state = 'idle';
                                io.emit('bearUpdate', b);
                            }
                        });
                        // Clear dogs too
                         Object.values(dogs).forEach(d => {
                            if (d.target === player.id) {
                                d.target = null;
                                d.state = 'idle';
                                io.emit('dogUpdate', d);
                            }
                        });
                        
                        io.emit('playerRespawn', player);
                    } else {
                        io.emit('playerUpdate', player);
                    }
                }
            }
        } else if (bear.state === 'angry' && (!bear.target || !players[bear.target])) {
            bear.state = 'idle';
            bear.target = null;
            changedBears[bear.id] = bear;
        } else if (bear.state === 'idle') {
            if (bear.wanderTarget) {
                const dx = bear.wanderTarget.x - bear.position.x;
                const dz = bear.wanderTarget.z - bear.position.z;
                const dist = Math.sqrt(dx*dx + dz*dz);
                
                if (dist < 0.2) {
                    bear.wanderTarget = null;
                    bear.nextWanderTime = now + 2000 + Math.random() * 3000;
                } else {
                    const speed = 0.1;
                    bear.position.x += (dx / dist) * speed;
                    bear.position.z += (dz / dist) * speed;
                    bear.rotation[1] = Math.atan2(dx, dz);
                    changedBears[bear.id] = bear; 
                }
            } else {
                if (now > bear.nextWanderTime) {
                    const radius = 5;
                    const angle = Math.random() * Math.PI * 2;
                    const dist = Math.random() * radius;
                    
                    bear.wanderTarget = {
                        x: bear.anchorPosition.x + Math.sin(angle) * dist,
                        z: bear.anchorPosition.z + Math.cos(angle) * dist
                    };
                }
            }
        }
    });

    if (Object.keys(changedBears).length > 0) {
        io.emit('bearsMoved', changedBears);
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
                 const speed = 0.16; // Adjusted for 5Hz (0.08 * 2)
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
             traderUpdated = true;
        }
        
        if (traderUpdated) {
            io.emit('traderUpdate', trader);
        }
    }
}, 200); // 5 Hz (200ms)

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
  socket.emit('currentBears', bears);
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

  // Helper for Dog Damage
  const handleDogDamage = (dogId, damage, attackerId) => {
      const dog = dogs[dogId];
      if (!dog) return;

    dog.hp -= damage;
    io.emit('dogDamage', dog.id);
    
    // Aggro Logic (Tribe)
    if (dog.state !== 'angry') {
         const tribeId = dog.tribeId;
         
         // Aggro entire tribe
         Object.values(dogs).forEach(d => {
             if (d.tribeId === tribeId) {
                 d.state = 'angry';
                 d.target = attackerId;
                 io.emit('dogUpdate', d);
             }
         });
      }

    if (dog.hp <= 0) {
        const tribeId = dog.tribeId;
        const position = { ...dog.position }; // Capture position before delete
        delete dogs[dogId];
        io.emit('dogKilled', dogId);
        
        // Check if tribe is wiped
        const remaining = Object.values(dogs).filter(d => d.tribeId === tribeId).length;
        if (remaining === 0) {
            console.log(`Tribe ${tribeId} wiped out. Respawning in 3-5 mins.`);
            // 3-5 minutes = 180s - 300s
            const delay = 180000 + Math.random() * 120000; 
            setTimeout(() => {
                spawnTribe(tribeId);
            }, delay);
        }
          
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
  };

  const handleBearDamage = (bearId, damage, attackerId) => {
      const bear = bears[bearId];
      if (!bear) return;

    bear.hp -= damage;
    io.emit('bearDamage', bear.id);
    
    if (bear.state !== 'angry') {
         const tribeId = bear.tribeId;
         Object.values(bears).forEach(b => {
             if (b.tribeId === tribeId) {
                 b.state = 'angry';
                 b.target = attackerId;
                 io.emit('bearUpdate', b);
             }
         });
      }

    if (bear.hp <= 0) {
        const tribeId = bear.tribeId;
        const position = { ...bear.position };
        delete bears[bearId];
        io.emit('bearKilled', bearId);
        
        const remaining = Object.values(bears).filter(b => b.tribeId === tribeId).length;
        if (remaining === 0) {
            const delay = 180000 + Math.random() * 120000; 
            setTimeout(() => {
                spawnBearTribe(tribeId);
            }, delay);
        }
          
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
          io.emit('bearUpdate', bear);
      }
  };

  socket.on('playerAttack', () => {
      if (players[socket.id]) {
          const player = players[socket.id];
          player.lastAttack = Date.now();
          io.emit('playerUpdate', player);

          // Check for dogs in range (Melee range ~ 3.0)
          Object.values(dogs).forEach(dog => {
              const dx = dog.position.x - player.position[0];
              const dz = dog.position.z - player.position[2];
              const dist = Math.sqrt(dx*dx + dz*dz);
              
              if (dist < 3.0) {
                  handleDogDamage(dog.id, 20, socket.id);
              }
          });

          // Check for bears
          Object.values(bears).forEach(bear => {
            const dx = bear.position.x - player.position[0];
            const dz = bear.position.z - player.position[2];
            const dist = Math.sqrt(dx*dx + dz*dz);
            
            if (dist < 4.0) { // Bigger hit range
                handleBearDamage(bear.id, 20, socket.id);
            }
        });
      }
  });

  socket.on('attackDog', (dogId) => {
      const dog = dogs[dogId];
      if (dog) {
          // INTERACTION ONLY - NO DAMAGE
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
      }
  });

  socket.on('attackBear', (bearId) => {
      const bear = bears[bearId];
      if (bear) {
           if (bear.state !== 'angry') {
             const tribeId = bear.tribeId;
             const target = socket.id;

             Object.values(bears).forEach(b => {
                 if (b.tribeId === tribeId) {
                     b.state = 'angry';
                     b.target = target;
                     io.emit('bearUpdate', b);
                 }
             });
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
              // Init inventory if missing
              if (!p.inventory) p.inventory = [];
              
              // Add to Server Inventory (Stacking)
              const existing = p.inventory.find(i => i.itemId === item.itemId);
              if (existing) {
                  existing.count++;
              } else {
                  p.inventory.push({ itemId: item.itemId, count: 1 });
              }

              delete droppedItems[itemId];
              io.emit('itemRemoved', itemId);
              socket.emit('inventoryAdd', item);
          }
      }
  });

  // Use Item (Potion)
  socket.on('useItem', (itemId) => {
      const p = players[socket.id];
      if (p) {
          if (itemId === 'health_potion') {
              p.hp = 100; // Heal to full
              
              // Remove from server inventory
              // (Simplified: assuming client validated count, but we should track)
              if (p.inventory) {
                  const existing = p.inventory.find(i => i.itemId === itemId);
                  if (existing) {
                      existing.count--;
                      if (existing.count <= 0) {
                          const idx = p.inventory.indexOf(existing);
                          p.inventory.splice(idx, 1);
                      }
                  }
              }
              
              io.emit('playerUpdate', p);
          }
      }
  });

  // Trade (Buy Item)
  socket.on('trade', ({ itemId, cost }) => {
      const p = players[socket.id];
      if (p && p.inventory) {
           const gold = p.inventory.find(i => i.itemId === 'gold');
           if (gold && gold.count >= cost) {
               // Deduct Gold
               gold.count -= cost;
               if (gold.count <= 0) {
                   const idx = p.inventory.indexOf(gold);
                   p.inventory.splice(idx, 1);
               }
               
               // Give Item
               // Create a new item instance
               const newItem = {
                   id: `bought-${Date.now()}`,
                   itemId: itemId,
                   // Server inventory update
               };
               
               // Add to server inventory
               const existing = p.inventory.find(i => i.itemId === itemId);
               if (existing) {
                    existing.count++;
               } else {
                    p.inventory.push({ itemId: itemId, count: 1 });
               }

               // Tell client to add it
               socket.emit('inventoryAdd', newItem);
           }
      }
  });

  // Drop Item (Throw Away)
  socket.on('dropItem', (itemId) => {
      const p = players[socket.id];
      if (p && p.inventory) {
          const existing = p.inventory.find(i => i.itemId === itemId);
          if (existing) {
              existing.count--;
              if (existing.count <= 0) {
                  const idx = p.inventory.indexOf(existing);
                  p.inventory.splice(idx, 1);
              }
              
              // Spawn item in world
              const def = itemsDef.find(d => d.id === itemId);
              const dropId = `dropped-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
              
              const drop = {
                  id: dropId,
                  itemId: itemId,
                  position: {
                      x: p.position[0] + (Math.random() - 0.5), 
                      z: p.position[2] + (Math.random() - 0.5)
                  },
                  image: def ? def.image : '❓'
              };
              
              droppedItems[dropId] = drop;
              io.emit('itemDropped', drop);
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
    
    Object.values(bears).forEach(bear => {
        if (bear.target === socket.id) {
            bear.target = null;
            bear.state = 'idle';
            io.emit('bearUpdate', bear);
        }
    });
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
