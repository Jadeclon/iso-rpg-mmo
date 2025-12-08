import { useFrame } from '@react-three/fiber';
import { useStore } from '../store';
import { World } from './World';
import { Player } from './Player';
import { socket } from './SocketManager';
import { soundManager } from '../SoundManager';
import { useState, useEffect, useRef } from 'react';
import { Trader } from './Trader';
import { Vector3 } from 'three';

import { LEVEL_DATA } from '../levelData';
import { ItemDrops } from './ItemDrops';
import itemsDef from '../items.json';

export const Experience = () => {
  const players = useStore((state) => state.players);
  const trader = useStore((state) => state.trader);
  const myId = socket.id;

  // Input handling
  const [movement, setMovement] = useState({ x: 0, z: 0 });
  
  // Jump state (using ref for performance in useFrame)
  const jumpState = useRef({
    isJumping: false,
    velocityY: 0,
    currentY: 0
  });

  useEffect(() => {
    const handleKeyDown = (e) => {
      // ... (keep existing input login)
      if (e.code === 'Space') {
          const currentPlayers = useStore.getState().players;
          const myId = socket.id;
          const player = currentPlayers[myId];
          
          if (player) {
              const rightHandItem = player.equipment?.rightHand;
              const itemDef = itemsDef.find(i => i.id === rightHandItem);
              const hasWeapon = itemDef?.type === 'weapon';
              
              if (player.skin === 'warrior' || hasWeapon) {
                  socket.emit('playerAttack');
                  useStore.getState().setPlayerAttacking(myId);
              }
          }
      }
      // Jump on Shift press
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
          if (!jumpState.current.isJumping) {
              jumpState.current.isJumping = true;
              jumpState.current.velocityY = 8; // Initial jump velocity
          }
      }
      switch (e.key.toLowerCase()) {
        case 'w': setMovement(m => ({ ...m, z: -1 })); break;
        case 's': setMovement(m => ({ ...m, z: 1 })); break;
        case 'a': setMovement(m => ({ ...m, x: -1 })); break;
        case 'd': setMovement(m => ({ ...m, x: 1 })); break;
      }
    };
    const handleKeyUp = (e) => {
      switch (e.key.toLowerCase()) {
        case 'w': setMovement(m => ({ ...m, z: 0 })); break;
        case 's': setMovement(m => ({ ...m, z: 0 })); break;
        case 'a': setMovement(m => ({ ...m, x: 0 })); break;
        case 'd': setMovement(m => ({ ...m, x: 0 })); break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const checkCollision = (position) => {
      for (const tree of LEVEL_DATA.trees) {
          const dx = position[0] - tree.position[0];
          const dz = position[2] - tree.position[2];
          const dist = Math.sqrt(dx*dx + dz*dz);
          if (dist < tree.radius + 0.5) return true; // 0.5 is player radius
      }
      for (const rock of LEVEL_DATA.rocks) {
          const dx = position[0] - rock.position[0];
          const dz = position[2] - rock.position[2];
          const dist = Math.sqrt(dx*dx + dz*dz);
          if (dist < rock.radius + 0.5) return true;
      }
      // House collision (rectangular bounding box)
      const house = LEVEL_DATA.house;
      if (house) {
          const playerRadius = 0.5;
          const hx = house.position[0];
          const hz = house.position[2];
          const halfW = house.width / 2 + playerRadius;
          const halfD = house.depth / 2 + playerRadius;
          
          if (position[0] > hx - halfW && position[0] < hx + halfW &&
              position[2] > hz - halfD && position[2] < hz + halfD) {
              return true;
          }
      }
      return false; 
  };

  const getRiverX = (z) => Math.sin(z * 0.05) * 20 + Math.sin(z * 0.1) * 10;
  const isPositionInRiver = (x, z) => {
      const riverX = getRiverX(z);
      return Math.abs(x - riverX) < 8.0; 
  };

  useFrame((state, delta) => {
    if (!myId || !players[myId]) return;

    const speed = 5 * delta;
    const currentPos = players[myId].position;
    
    if (movement.x !== 0 || movement.z !== 0) {
        let moveX = movement.x;
        let moveZ = movement.z;

        if (useStore.getState().cameraBasedMovement) {
             const cam = state.camera;
             const forward = new Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
             forward.y = 0;
             forward.normalize();
             
             const right = new Vector3(1, 0, 0).applyQuaternion(cam.quaternion);
             right.y = 0;
             right.normalize();

             // W (z=-1) should move in forward direction
             // S (z=1) should move backward
             // D (x=1) should move right 
             // A (x=-1) should move left
             
             // movement.z is -1 for W. We want positive Forward scale.
             // So scale = -movement.z
             
             const worldDir = forward.clone().multiplyScalar(-movement.z).add(right.clone().multiplyScalar(movement.x));
             worldDir.normalize(); // Ensure combined speed isn't faster (already handled basically but good to be safe)
             
             // Map back to nextX/nextZ logic which expects raw offsets
             // Logic below: nextX = currentPos + moveX * speed
             // So we just replace moveX/moveZ with our calculated direction components
             moveX = worldDir.x;
             moveZ = worldDir.z;
        }

        let nextX = currentPos[0] + moveX * speed;
        let nextZ = currentPos[2] + moveZ * speed;
        
        // Simple collision check per axis to allow sliding
        if (checkCollision([nextX, 0, currentPos[2]])) {
            nextX = currentPos[0];
        }
        if (checkCollision([currentPos[0], 0, nextZ])) {
            nextZ = currentPos[2];
        }
        
        // If still colliding (corner case), don't move
        if (checkCollision([nextX, 0, nextZ])) {
             return;
        }

        const newPos = [nextX, currentPos[1], nextZ];
        
        // Optimistic update (Local)
        useStore.getState().updatePlayerPosition(myId, newPos);

        // Network update (Throttled)
        const now = Date.now();
        if (!state.lastSocketEmit || now - state.lastSocketEmit > 50) { // 20Hz (50ms)
             socket.emit('playerMove', newPos);
             state.lastSocketEmit = now;
        }

        // Step Sounds
        // const now = Date.now(); // reuse 'now' from above
        if (!state.lastStepTime || now - state.lastStepTime > 350) { // 350ms between steps
            const inRiver = isPositionInRiver(newPos[0], newPos[2]);
            soundManager.playStepSound(inRiver);
            state.lastStepTime = now;
        }
    }
    
    // Handle jumping physics (runs every frame regardless of movement)
    const jump = jumpState.current;
    if (jump.isJumping || jump.currentY > 0) {
        const gravity = 25; // Gravity strength
        jump.velocityY -= gravity * delta;
        jump.currentY += jump.velocityY * delta;
        
        // Ground check
        if (jump.currentY <= 0) {
            jump.currentY = 0;
            jump.velocityY = 0;
            jump.isJumping = false;
        }
        
        // Update player Y position
        const currentPos = players[myId].position;
        const newPos = [currentPos[0], jump.currentY, currentPos[2]];
        useStore.getState().updatePlayerPosition(myId, newPos);
        
        // Network update for jump position
        const now = Date.now();
        if (!jumpState.current.lastEmit || now - jumpState.current.lastEmit > 50) {
            socket.emit('playerMove', newPos);
            jumpState.current.lastEmit = now;
        }
    }
  });

  return (
    <group>
      <World />
      <ItemDrops />
      {trader && (
          <Trader 
            key="trader_main"
            id="trader_main"
            position={[trader.position.x, trader.position.y || 0, trader.position.z]} 
            rotation={trader.rotation}
            wanderTarget={trader.wanderTarget}
          />
      )}
      {Object.values(players).map((player) => (
        <Player 
            key={player.id} 
            position={player.position} 
            color={player.color} 
            skin={player.skin}
            lastAttack={player.lastAttack}
            hp={player.hp}
            maxHp={player.maxHp}
            equipment={player.equipment}
            isLocal={player.id === myId} 
        />
      ))}
    </group>
  );
};
