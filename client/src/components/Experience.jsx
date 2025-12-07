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

export const Experience = () => {
  const players = useStore((state) => state.players);
  const myId = socket.id;

  // Input handling
  const [movement, setMovement] = useState({ x: 0, z: 0 });

  useEffect(() => {
    const handleKeyDown = (e) => {
      // ... (keep existing input login)
      if (e.code === 'Space') {
          const currentPlayers = useStore.getState().players;
          const myId = socket.id;
          if (currentPlayers[myId] && currentPlayers[myId].skin === 'warrior') {
              socket.emit('playerAttack');
              useStore.getState().setPlayerAttacking(myId);
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
        let nextX = currentPos[0] + movement.x * speed;
        let nextZ = currentPos[2] + movement.z * speed;
        
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
        
        // Optimistic update
        useStore.getState().updatePlayerPosition(myId, newPos);
        socket.emit('playerMove', newPos);

        // Step Sounds
        const now = Date.now();
        if (!state.lastStepTime || now - state.lastStepTime > 350) { // 350ms between steps
            const inRiver = isPositionInRiver(newPos[0], newPos[2]);
            soundManager.playStepSound(inRiver);
            state.lastStepTime = now;
        }
    }
  });

  return (
    <group>
      <World />
      <ItemDrops />
      <Trader />
      {Object.values(players).map((player) => (
        <Player 
            key={player.id} 
            position={player.position} 
            color={player.color} 
            skin={player.skin}
            lastAttack={player.lastAttack}
            hp={player.hp}
            maxHp={player.maxHp}
            isLocal={player.id === myId} 
        />
      ))}
    </group>
  );
};
