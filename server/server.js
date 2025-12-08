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

// Mob Managers
const dogManager = require('./mobs/Dog');
const bearManager = require('./mobs/Bear');

// Game State
// Game State
const shopConfig = require('./shop.json');
const SHOP_PRICES = {};
shopConfig.forEach(item => {
    SHOP_PRICES[item.id] = item.price;
});
// Add buy-back or internal prices that aren't in the public shop here if needed
SHOP_PRICES['sword_wood'] = 10;

const players = {};
// dogs and bears are managed by managers
const campfires = {};
const droppedItems = {};
const itemsDef = require('./items.json');
// lootTables? Used by managers, but also used here? No, moved to managers. But actually server had logic for item drops?
// Wait, droppedItems is here. Managers need access to droppedItems.
// We passed droppedItems to handleDamage, but not to update?
// Update only spawns... wait, update handles attacks too?
// In my refactor: `dogManager.update` includes attack logic.
// If dog kills player, it doesn't drop items.
// If player kills dog (handleDamage), it drops items.
// So `update` doesn't need droppedItems. `handleDamage` does.

// Managers need initialization
dogManager.init(io);
bearManager.init(io);

let trader = {
    id: 'trader-1',
    position: { x: (Math.random() * 40) - 20, z: (Math.random() * 40) - 20 }, // Random spawn
    anchorPosition: null, // Set after init
    width: 1, // Collision size
    rotation: [0, 0, 0],
    items: ['potion', 'sword', 'campfire'],
    wanderTarget: null,
    nextWanderTime: Date.now() + 5000
};
trader.anchorPosition = { ...trader.position };

// Helper to check if in river - moved to utils but server might not need it anymore unless trader uses it?
// Trader logic in server.js doesn't check river, it loops loosely.
// Spawn logic uses it. Managers use it. Server.js doesn't seem to need it explicitly.

// Game Loop
setInterval(() => {
    const now = Date.now();

    // Central Respawn Handler
    const handlePlayerDeath = (player) => {
        player.hp = 100; // Reset HP
        player.position = [0, 0, 0]; // Reset Position
        
        dogManager.clearAggro(player.id, io);
        bearManager.clearAggro(player.id, io);
        
        io.emit('playerRespawn', player);
    };

    dogManager.update(io, players, handlePlayerDeath);
    bearManager.update(io, players, handlePlayerDeath);
    
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
                 const speed = 0.16;
                 const nextX = trader.position.x + (dx / dist) * speed;
                 const nextZ = trader.position.z + (dz / dist) * speed;
                 
                 // Check house collision
                 const { isPositionInHouse } = require('./utils');
                 if (!isPositionInHouse(nextX, nextZ, 0.5)) {
                     trader.position.x = nextX;
                     trader.position.z = nextZ;
                 } else {
                     // Cancel wander if blocked
                     trader.wanderTarget = null;
                     trader.nextWanderTime = now + 1000;
                 }
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
}, 200);

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Initialize new player
  players[socket.id] = {
    id: socket.id,
    position: [0, 0, 0], // x, y, z
    color: '#' + Math.floor(Math.random()*16777215).toString(16),
    hp: 100,
    maxHp: 100,
    equipment: { rightHand: 'sword_wood' },
    inventory: [{ itemId: 'sword_long', count: 1 }]
  };

  // Send current players and dogs to new player
  socket.emit('currentPlayers', players);
  socket.emit('currentDogs', dogManager.dogs);
  socket.emit('currentBears', bearManager.bears);
  socket.emit('currentCampfires', campfires);
  socket.emit('currentItems', droppedItems);
  socket.emit('traderUpdate', trader);
  socket.emit('shopConfig', shopConfig);
  socket.emit('itemDefinitions', itemsDef);

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
          const player = players[socket.id];
          player.lastAttack = Date.now();
          io.emit('playerUpdate', player);
          
          // Calculate Damage
          const rightHandId = player.equipment?.rightHand;
          const weapon = itemsDef.find(i => i.id === rightHandId);
          const damage = weapon?.damage || 5;

          // Check for dogs in range
          Object.values(dogManager.dogs).forEach(dog => {
              const dx = dog.position.x - player.position[0];
              const dz = dog.position.z - player.position[2];
              const dist = Math.sqrt(dx*dx + dz*dz);
              
              if (dist < 3.0) {
                  dogManager.handleDamage(dog.id, damage, socket.id, io, droppedItems);
              }
          });

          // Check for bears
          Object.values(bearManager.bears).forEach(bear => {
            const dx = bear.position.x - player.position[0];
            const dz = bear.position.z - player.position[2];
            const dist = Math.sqrt(dx*dx + dz*dz);
            
            if (dist < 4.0) { 
                bearManager.handleDamage(bear.id, damage, socket.id, io, droppedItems);
            }
        });
      }
  });

  socket.on('attackDog', (dogId) => {
      const dog = dogManager.dogs[dogId];
      if (dog) {
           if (dog.state !== 'angry') {
             const tribeId = dog.tribeId;
             const target = socket.id;

             // Aggro entire tribe via manager
             Object.values(dogManager.dogs).forEach(d => {
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
      const bear = bearManager.bears[bearId];
      if (bear) {
           if (bear.state !== 'angry') {
             const tribeId = bear.tribeId;
             const target = socket.id;

             Object.values(bearManager.bears).forEach(b => {
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
          
          if (dist < 2.0) { 
              if (!p.inventory) p.inventory = [];
              const existing = p.inventory.find(i => i.itemId === item.itemId);
              if (existing) {
                  existing.count++;
              } else {
                  p.inventory.push({ itemId: item.itemId, count: 1 });
              }

              delete droppedItems[itemId];
              io.emit('itemRemoved', itemId);
              socket.emit('inventoryAdd', item);
              io.emit('playerUpdate', p);
          }
      }
  });

  // Use Item
  socket.on('useItem', (itemId) => {
      const p = players[socket.id];
      if (p) {
          if (itemId === 'health_potion') {
              p.hp = 100;
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
          } else if (itemId === 'campfire') {
              const id = `campfire-${Date.now()}`;
              const pos = { x: p.position[0], y: 0, z: p.position[2] };
              campfires[id] = { id, position: pos };
              
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
              io.emit('campfirePlaced', campfires[id]);
              io.emit('playerUpdate', p);
          } else if (itemId === 'meat') {
              let nearFire = false;
              Object.values(campfires).forEach(fire => {
                  const dx = fire.position.x - p.position[0];
                  const dz = fire.position.z - p.position[2];
                  const dist = Math.sqrt(dx*dx + dz*dz);
                  if (dist < 2.0) nearFire = true;
              });

              if (nearFire) {
                   if (p.inventory) {
                      const existing = p.inventory.find(i => i.itemId === itemId);
                      if (existing) {
                          existing.count--;
                          if (existing.count <= 0) {
                              const idx = p.inventory.indexOf(existing);
                              p.inventory.splice(idx, 1);
                          }
                           const cooked = p.inventory.find(i => i.itemId === 'cooked_meat');
                           if (cooked) {
                               cooked.count++;
                           } else {
                               p.inventory.push({ itemId: 'cooked_meat', count: 1 });
                           }
                           socket.emit('inventoryAdd', { itemId: 'cooked_meat', id: 'cooked' });
                      }
                  }
                  io.emit('playerUpdate', p);
              }
          } else if (itemId === 'cooked_meat') {
               p.hp = Math.min(p.maxHp, p.hp + 50);
               if (p.inventory) {
                  const existing = p.inventory.find(i => i.itemId === itemId);
                  if (existing) {
                      existing.count--;
                      if (existing.count <= 0) {
                          const idx = p.inventory.indexOf(existing);
                          p.inventory.splice(idx, 1);
                      }
                  }
             io.emit('playerUpdate', p);
          }
      }
      }
  });

  // Trade
  socket.on('trade', ({ itemId }) => {
      const p = players[socket.id];
      if (p && p.inventory) {
           const price = SHOP_PRICES[itemId];
           if (!price) return; // Invalid item

           const gold = p.inventory.find(i => i.itemId === 'gold');
           if (gold && gold.count >= price) {
               gold.count -= price;
               if (gold.count <= 0) {
                   const idx = p.inventory.indexOf(gold);
                   p.inventory.splice(idx, 1);
               }
               
               const newItem = {
                   id: `bought-${Date.now()}`,
                   itemId: itemId,
               };
               
               const existing = p.inventory.find(i => i.itemId === itemId);
               if (existing) {
                    existing.count++;
               } else {
                    p.inventory.push({ itemId: itemId, count: 1 });
               }

               socket.emit('inventoryAdd', newItem);
               io.emit('playerUpdate', p); // Sync gold
           } else {
               socket.emit('chatMessage', { sender: 'System', text: 'Not enough Gold!', color: 'red' });
               io.emit('playerUpdate', p); // Revert optimistic
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
              
              const def = itemsDef.find(d => d.id === itemId);
              const dropId = `dropped-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
              
              const drop = {
                  id: dropId,
                  itemId: itemId,
                  position: {
                      x: p.position[0] + (Math.random() - 0.5), 
                      z: p.position[2] + (Math.random() - 0.5)
                  }
              };
              
              droppedItems[dropId] = drop;
              io.emit('itemDropped', drop);
              io.emit('playerUpdate', p);
          }
      }
  });

  // Equip Item (Weapon Swap)
  // Equip Item (Weapon/Shield Swap)
  socket.on('equipItem', (itemId) => {
      const p = players[socket.id];
      if (p && p.inventory) {
          // Check ownership
          const itemInInv = p.inventory.find(i => i.itemId === itemId);
          if (itemInInv) {
               // Determine item type
               const def = itemsDef.find(d => d.id === itemId);
               const isShield = def && def.type === 'shield';
               
               // 1. Remove from inventory
               itemInInv.count--;
               if (itemInInv.count <= 0) {
                   const idx = p.inventory.indexOf(itemInInv);
                   p.inventory.splice(idx, 1);
               }

               if (!p.equipment) p.equipment = {};

               let oldItemId = null;
               
               if (isShield) {
                   // Equip to Left Hand
                   if (p.equipment.leftHand) {
                       oldItemId = p.equipment.leftHand;
                   }
                   p.equipment.leftHand = itemId;
               } else {
                   // Equip to Right Hand (Weapon)
                   // Default sword logic: if rightHand was undefined, it was 'sword_wood' virtually.
                   // But if we unequip, we must return the actual item ID.
                   // If p.equipment.rightHand is undefined, the player "has" sword_wood but it's not in equipment.
                   // So we treat it as if they are unequipping 'sword_wood'.
                   oldItemId = p.equipment.rightHand || 'sword_wood';
                   p.equipment.rightHand = itemId;
               }
               
               // 4. Return old item to inventory
               if (oldItemId) {
                    const oldItemExisting = p.inventory.find(i => i.itemId === oldItemId);
                    if (oldItemExisting) {
                         oldItemExisting.count++;
                    } else {
                         p.inventory.push({ itemId: oldItemId, count: 1 });
                    }
                    socket.emit('inventoryAdd', { id: `uneq-${Date.now()}`, itemId: oldItemId });
               }

               // 5. Sync
               io.emit('playerUpdate', p);
          }
      }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    delete players[socket.id];
    io.emit('playerDisconnected', socket.id);
    
    // Clear Aggro
    dogManager.clearAggro(socket.id, io);
    bearManager.clearAggro(socket.id, io);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
