const { isPositionInRiver, isPositionInHouse } = require('../utils');
const lootTables = require('../lootTables');

class DogManager {
    constructor() {
        this.dogs = {};
        this.itemsDef = require('../items.json');
        this.damage = 10;
        this.attackSpeed = 2000;
        this.maxHp = 100;
        this.tribeCount = 3;
        this.tribesTotal = 3;
    }

    spawnTribe(tribe, io) {
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
        
        for (let i = 0; i < this.tribeCount; i++) {
            const offsetX = (Math.random() - 0.5) * 4;
            const offsetZ = (Math.random() - 0.5) * 4;
            
            const position = { x: tribeX + offsetX, y: 0, z: tribeZ + offsetZ };
            const id = `dog-tribe${tribe}-${Date.now()}-${i}`;
            this.dogs[id] = {
                id: id,
                position: position,
                anchorPosition: { ...position },
                rotation: [0, Math.random() * Math.PI * 2, 0],
                hp: this.maxHp,
                maxHp: this.maxHp,
                state: 'idle', 
                target: null,
                tribeId: tribe,
                wanderTarget: null,
                nextWanderTime: Date.now() + Math.random() * 5000
            };
        }
        if (io) io.emit('dogsMoved', this.dogs); 
    }

    init(io) {
        let numTribes = this.tribesTotal;
        if(process.env.TRIBES) numTribes = this.tribesTotal * process.env.TRIBES;
        for (let tribe = 0; tribe < numTribes; tribe++) {
            this.spawnTribe(tribe, io);
        }
    }

    update(io, players, onPlayerDeath) {
        const changedDogs = {};
        const now = Date.now();

        Object.values(this.dogs).forEach(dog => {
            if (dog.state === 'angry' && dog.target && players[dog.target]) {
                const player = players[dog.target];
                const dx = player.position[0] - dog.position.x;
                const dz = player.position[2] - dog.position.z;
                const dist = Math.sqrt(dx*dx + dz*dz);
                
                if (dist > 20) {
                    dog.state = 'idle';
                    dog.target = null;
                    changedDogs[dog.id] = dog;
                    io.emit('dogUpdate', dog);
                } else if (dist > 1.5) { 
                    const speed = 0.44; 
                    const nextX = dog.position.x + (dx / dist) * speed;
                    const nextZ = dog.position.z + (dz / dist) * speed;
                    
                    // Only move if not colliding with house
                    if (!isPositionInHouse(nextX, nextZ, 0.5)) {
                        dog.position.x = nextX;
                        dog.position.z = nextZ;
                    }
                    dog.rotation[1] = Math.atan2(dx, dz);
                    changedDogs[dog.id] = dog;
                } else {
                    if (!dog.lastAttack || now - dog.lastAttack > this.attackSpeed) {
                        player.hp -= this.damage;
                        dog.lastAttack = now;
                        io.emit('dogBark', dog.id);
                        
                        if (player.hp <= 0) {
                            if (onPlayerDeath) {
                                onPlayerDeath(player);
                            }
                        } else {
                            io.emit('playerUpdate', player);
                        }
                    }
                }
            } else if (dog.state === 'angry' && (!dog.target || !players[dog.target])) {
                dog.state = 'idle';
                dog.target = null;
                changedDogs[dog.id] = dog;
            } else if (dog.state === 'idle') {
                if (dog.wanderTarget) {
                    const dx = dog.wanderTarget.x - dog.position.x;
                    const dz = dog.wanderTarget.z - dog.position.z;
                    const dist = Math.sqrt(dx*dx + dz*dz);
                    
                    if (dist < 0.2) {
                        dog.wanderTarget = null;
                        dog.nextWanderTime = now + 2000 + Math.random() * 3000; 
                    } else {
                        const speed = 0.1; 
                        const nextX = dog.position.x + (dx / dist) * speed;
                        const nextZ = dog.position.z + (dz / dist) * speed;
                        
                        // Only move if not colliding with house
                        if (!isPositionInHouse(nextX, nextZ, 0.5)) {
                            dog.position.x = nextX;
                            dog.position.z = nextZ;
                            dog.rotation[1] = Math.atan2(dx, dz);
                            changedDogs[dog.id] = dog; 
                        } else {
                            // Cancel wander target if blocked by house
                            dog.wanderTarget = null;
                            dog.nextWanderTime = now + 1000;
                        }
                    }
                } else {
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
    }

    handleDamage(dogId, damage, attackerId, io, droppedItems) {
        const dog = this.dogs[dogId];
        if (!dog) return;
  
        dog.hp -= damage;
        io.emit('dogDamage', dog.id);
      
        if (dog.state !== 'angry') {
             const tribeId = dog.tribeId;
             Object.values(this.dogs).forEach(d => {
                 if (d.tribeId === tribeId) {
                     d.state = 'angry';
                     d.target = attackerId;
                     io.emit('dogUpdate', d);
                 }
             });
        }
  
        if (dog.hp <= 0) {
            const tribeId = dog.tribeId;
            const position = { ...dog.position };
            delete this.dogs[dogId];
            io.emit('dogKilled', dogId);
            
            const remaining = Object.values(this.dogs).filter(d => d.tribeId === tribeId).length;
            if (remaining === 0) {
                console.log(`Tribe ${tribeId} wiped out. Respawning in 3-5 mins.`);
                const delay = 180000 + Math.random() * 120000; 
                setTimeout(() => {
                    this.spawnTribe(tribeId, io);
                }, delay);
            }
            
            // Drop Items
            const drops = lootTables['dog'] || [];
            drops.forEach(dropDef => {
                if (Math.random() < dropDef.rate) {
                    const min = dropDef.min || 1;
                    const max = dropDef.max || 1;
                    const count = Math.floor(Math.random() * (max - min + 1)) + min;
  
                    for (let i = 0; i < count; i++) {
                      const id = `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                      const itemInfo = this.itemsDef.find(i => i.id === dropDef.itemId);
                      
                      if (itemInfo) {
                          const drop = {
                              id: id,
                              itemId: dropDef.itemId,
                              position: {
                                  x: position.x + (Math.random() - 0.5), 
                                  z: position.z + (Math.random() - 0.5)
                              }
                          };
                          droppedItems[id] = drop; // We need to modify the global droppedItems
                          io.emit('itemDropped', drop);
                      }
                    }
                }
            });
        } else {
            io.emit('dogUpdate', dog);
        }
    }
    
    // Helper to clear aggro on a specific target
    clearAggro(targetId, io) {
         Object.values(this.dogs).forEach(d => {
            if (d.target === targetId) {
                d.target = null;
                d.state = 'idle';
                io.emit('dogUpdate', d);
            }
        });
    }
}

module.exports = new DogManager();
