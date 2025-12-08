const { isPositionInRiver, isPositionInHouse } = require('../utils');
const lootTables = require('../lootTables');

class BearManager {
    constructor() {
        this.bears = {};
        this.itemsDef = require('../items.json');
        this.damage = 25;
        this.attackSpeed = 2500;
        this.maxHp = 200;
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
            const id = `bear-tribe${tribe}-${Date.now()}-${i}`;
            this.bears[id] = {
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
        if (io) io.emit('bearsMoved', this.bears); 
    }

    init(io) {
        let numTribes = this.tribesTotal;
        if(process.env.TRIBES) numTribes = this.tribesTotal * process.env.TRIBES;
        for (let tribe = 0; tribe < numTribes; tribe++) {
            this.spawnTribe(tribe, io);
        }
    }

    update(io, players, onPlayerDeath) {
        const changedBears = {};
        const now = Date.now();

        Object.values(this.bears).forEach(bear => {
            if (bear.state === 'angry' && bear.target && players[bear.target]) {
                const player = players[bear.target];
                const dx = player.position[0] - bear.position.x;
                const dz = player.position[2] - bear.position.z;
                const dist = Math.sqrt(dx*dx + dz*dz);
                
                if (dist > 20) {
                    bear.state = 'idle';
                    bear.target = null;
                    bear.jumpState = null; // Reset jump state
                    changedBears[bear.id] = bear;
                    io.emit('bearUpdate', bear);
                } else if (dist > 2.0) {
                    // Jump Attack Logic
                    if (!bear.jumpState) bear.jumpState = 'ready'; // active, charge, recovery

                    if (bear.jumpState === 'ready') {
                        const speed = 0.8; // Fast leap speed
                        const nextX = bear.position.x + (dx / dist) * speed;
                        const nextZ = bear.position.z + (dz / dist) * speed;
                        
                        // Only move if not colliding with house
                        if (!isPositionInHouse(nextX, nextZ, 0.8)) {
                            bear.position.x = nextX;
                            bear.position.z = nextZ;
                        }
                        bear.rotation[1] = Math.atan2(dx, dz);
                        changedBears[bear.id] = bear;
                    }
                } else {
                    // Attack logic
                    bear.jumpState = 'ready'; // Reset jump cycle if close enough to attack
                    if (!bear.lastAttack || now - bear.lastAttack > this.attackSpeed) {
                        player.hp -= this.damage; 
                        bear.lastAttack = now;
                            io.emit('bearRoar', bear.id); // Roar when hitting
                        
                        if (player.hp <= 0) {
                            if (onPlayerDeath) {
                                onPlayerDeath(player);
                            }
                        } else {
                            io.emit('playerUpdate', player);
                        }
                    }
                }
            } else if (bear.state === 'angry' && (!bear.target || !players[bear.target])) {
                bear.state = 'idle';
                bear.target = null;
                bear.jumpState = null;
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
                        const nextX = bear.position.x + (dx / dist) * speed;
                        const nextZ = bear.position.z + (dz / dist) * speed;
                        
                        // Only move if not colliding with house
                        if (!isPositionInHouse(nextX, nextZ, 0.8)) {
                            bear.position.x = nextX;
                            bear.position.z = nextZ;
                            bear.rotation[1] = Math.atan2(dx, dz);
                            changedBears[bear.id] = bear; 
                        } else {
                            // Cancel wander if blocked
                            bear.wanderTarget = null;
                            bear.nextWanderTime = now + 1000;
                        }
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
    }
    
    handleDamage(bearId, damage, attackerId, io, droppedItems) {
        const bear = this.bears[bearId];
        if (!bear) return;

        bear.hp -= damage;
        io.emit('bearDamage', bear.id);
        
        if (bear.state !== 'angry') {
             const tribeId = bear.tribeId;
             Object.values(this.bears).forEach(b => {
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
            delete this.bears[bearId];
            io.emit('bearKilled', bearId);
            
            const remaining = Object.values(this.bears).filter(b => b.tribeId === tribeId).length;
            if (remaining === 0) {
                const delay = 180000 + Math.random() * 120000; 
                setTimeout(() => {
                    this.spawnTribe(tribeId, io);
                }, delay);
            }
            
            // Drop Items
            const drops = lootTables['bear'] || [];
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
                            droppedItems[id] = drop;
                            io.emit('itemDropped', drop);
                        }
                    }
                }
            });
        } else {
            io.emit('bearUpdate', bear);
        }
    }

    clearAggro(targetId, io) {
        Object.values(this.bears).forEach(b => {
            if (b.target === targetId) {
                b.target = null;
                b.state = 'idle';
                io.emit('bearUpdate', b);
            }
        });
    }
}

module.exports = new BearManager();
