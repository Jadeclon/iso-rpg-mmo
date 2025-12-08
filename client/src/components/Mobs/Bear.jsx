import { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3, Quaternion, Matrix4, MathUtils } from 'three';
import { Html } from '@react-three/drei';
import { socket } from '../SocketManager';
import { useStore } from '../../store';

export const Bear = ({ id, position, rotation = [0, 0, 0], hp = 200, maxHp = 200, state = 'idle', jumpState, wanderTarget, targetId }) => {
  const group = useRef();
  const head = useRef();
  const tail = useRef();
  const leftLegF = useRef();
  const rightLegF = useRef();
  const leftLegB = useRef();
  const rightLegB = useRef();
  
  // Local Animation State Machine
  const localState = useRef('idle'); // 'idle', 'run', 'ready', 'leap', 'recovery'
  const stateTimer = useRef(0);
  const leapStart = useRef(0);
  
  const targetPos = useRef(new Vector3(...position));
  
  useEffect(() => {
     if (Array.isArray(position)) {
        targetPos.current.set(position[0], position[1], position[2]);
     } else {
        targetPos.current.set(position.x, position.y || 0, position.z);
     }
  }, [position]);
  
  const offset = useMemo(() => Math.random() * 100, []);
  const worldTarget = useMemo(() => new Vector3(), []);
  
  useFrame((stateCtx, delta) => {
      const now = stateCtx.clock.getElapsedTime();
      const t = now + offset;
      const lerpSpeed = delta * 15;
      
      // Update Physics/Position Interpolation
      if (group.current) {
         const lerpFactor = Math.min(delta * 10, 1);
         group.current.position.lerp(targetPos.current, lerpFactor); 
         if (rotation && rotation.length >= 2) {
            group.current.rotation.y = rotation[1];
         }
      }

      // ---------------------------------------------
      // Client-Side State Machine Logic
      // ---------------------------------------------
      if (state === 'angry') {
          const player = targetId ? useStore.getState().players[targetId] : null;
          let dist = 999;
          
          if (player && group.current) {
              const dx = player.position[0] - group.current.position.x;
              const dz = player.position[2] - group.current.position.z;
              dist = Math.sqrt(dx*dx + dz*dz);
          } else if (targetId === socket.id && group.current) {
              // Fallback if I am the target
               const myPos = useStore.getState().players[socket.id]?.position;
               if (myPos) {
                   const dx = myPos[0] - group.current.position.x;
                   const dz = myPos[2] - group.current.position.z;
                   dist = Math.sqrt(dx*dx + dz*dz);
               }
          }

          // State Transitions
          if (localState.current === 'idle' || localState.current === 'run') {
              if (dist < 4.0) {
                  // Trigger Attack Cycle
                  localState.current = 'ready';
                  stateTimer.current = now;
              } else {
                  localState.current = 'run';
              }
          } else if (localState.current === 'ready') {
              if (now - stateTimer.current > 0.5) { // 0.5s Ready/Charge
                  localState.current = 'leap';
                  stateTimer.current = now;
                  leapStart.current = now; 
              }
          } else if (localState.current === 'leap') {
              if (now - stateTimer.current > 0.8) { // 0.8s Leap
                  localState.current = 'recovery';
                  stateTimer.current = now;
              }
          } else if (localState.current === 'recovery') {
              if (now - stateTimer.current > 0.2) { // 0.2s Recovery
                  localState.current = 'run'; // Reset to run
                  stateTimer.current = now;
              }
          }
      } else {
          localState.current = 'idle';
      }
      
      const currentBehavior = localState.current;

      // ---------------------------------------------
      // Animation Logic (Visuals)
      // ---------------------------------------------
      if (currentBehavior === 'ready') {
          // Crouch / Charge
          group.current.position.y = MathUtils.lerp(group.current.position.y, position[1] - 0.2, lerpSpeed);
          group.current.rotation.x = MathUtils.lerp(group.current.rotation.x, 0.2, lerpSpeed);
          
          // Legs bent
          leftLegF.current.rotation.x = MathUtils.lerp(leftLegF.current.rotation.x, 0.5, lerpSpeed);
          rightLegF.current.rotation.x = MathUtils.lerp(rightLegF.current.rotation.x, 0.5, lerpSpeed);
          leftLegB.current.rotation.x = MathUtils.lerp(leftLegB.current.rotation.x, -0.5, lerpSpeed);
          rightLegB.current.rotation.x = MathUtils.lerp(rightLegB.current.rotation.x, -0.5, lerpSpeed);
          
          head.current.rotation.x = MathUtils.lerp(head.current.rotation.x, -0.2, lerpSpeed);
          
      } else if (currentBehavior === 'leap') {
          const timeSinceLeap = now - leapStart.current;
          const jumpProgress = Math.min(Math.max(timeSinceLeap / 0.8, 0), 1); // 0.8s duration
          const jumpHeight = Math.sin(jumpProgress * Math.PI) * 1.5; 
          
          const targetY = position[1] + Math.max(0, jumpHeight); 
          group.current.position.y = MathUtils.lerp(group.current.position.y, targetY, lerpSpeed);
          
          const targetRot = -0.5 + (jumpProgress * 0.5); 
          group.current.rotation.x = MathUtils.lerp(group.current.rotation.x, targetRot, lerpSpeed); 
          
          // Legs extended back for aerodynamics/leap
          leftLegF.current.rotation.x = MathUtils.lerp(leftLegF.current.rotation.x, -0.5, lerpSpeed);
          rightLegF.current.rotation.x = MathUtils.lerp(rightLegF.current.rotation.x, -0.5, lerpSpeed);
          leftLegB.current.rotation.x = MathUtils.lerp(leftLegB.current.rotation.x, -0.8, lerpSpeed);
          rightLegB.current.rotation.x = MathUtils.lerp(rightLegB.current.rotation.x, -0.8, lerpSpeed);
          
          head.current.rotation.x = MathUtils.lerp(head.current.rotation.x, 0.4, lerpSpeed); 

      } else if (currentBehavior === 'recovery') {
          // Landing impacts
          group.current.position.y = MathUtils.lerp(group.current.position.y, position[1] - 0.1, lerpSpeed); 
          group.current.rotation.x = MathUtils.lerp(group.current.rotation.x, 0.1, lerpSpeed);
          
          leftLegF.current.rotation.x = MathUtils.lerp(leftLegF.current.rotation.x, 0.2, lerpSpeed);
          rightLegF.current.rotation.x = MathUtils.lerp(rightLegF.current.rotation.x, 0.2, lerpSpeed);
          leftLegB.current.rotation.x = MathUtils.lerp(leftLegB.current.rotation.x, 0.2, lerpSpeed);
          rightLegB.current.rotation.x = MathUtils.lerp(rightLegB.current.rotation.x, 0.2, lerpSpeed);

      } else if (currentBehavior === 'run') {
          // Head up
          head.current.rotation.x = Math.sin(t * 0.3) * 0.1;

          // Leg animation - Slower, heavier stride than dog
          const speedFactor = 15; 
          // Gallop-like phasing
          leftLegF.current.rotation.x = Math.sin(t * speedFactor) * 0.6;
          rightLegF.current.rotation.x = Math.sin(t * speedFactor + 0.2) * 0.6; // Slightly offset
          leftLegB.current.rotation.x = Math.sin(t * speedFactor + Math.PI) * 0.6;
          rightLegB.current.rotation.x = Math.sin(t * speedFactor + Math.PI + 0.2) * 0.6;
          
          // Body Dynamic - Bound
          // Higher bobbing for bound feel
          const targetY = position[1] + Math.abs(Math.sin(t * speedFactor)) * 0.3;
          group.current.position.y = MathUtils.lerp(group.current.position.y, targetY, lerpSpeed);
          
          const targetRotX = Math.sin(t * speedFactor) * 0.1;
          group.current.rotation.x = MathUtils.lerp(group.current.rotation.x, targetRotX, lerpSpeed);

      } else {
          // IDLE
          group.current.rotation.x = MathUtils.lerp(group.current.rotation.x, 0, lerpSpeed);
          if (Math.abs(group.current.position.y - position[1]) > 0.001) {
              group.current.position.y = MathUtils.lerp(group.current.position.y, position[1], lerpSpeed); 
          }
          
          // Head look around checks
          head.current.rotation.y = Math.sin(t * 0.2) * 0.2; // Slower look
          head.current.rotation.x = Math.sin(t * 0.1) * 0.05;
          
          if (wanderTarget) {
            const speedFactor = 4; // Slow wander
            leftLegF.current.rotation.x = Math.sin(t * speedFactor) * 0.5;
            rightLegF.current.rotation.x = Math.sin(t * speedFactor + Math.PI) * 0.5;
            leftLegB.current.rotation.x = Math.sin(t * speedFactor + Math.PI) * 0.5;
            rightLegB.current.rotation.x = Math.sin(t * speedFactor) * 0.5;
            
            worldTarget.set(wanderTarget.x, group.current.position.y, wanderTarget.z);
            const dist = group.current.position.distanceTo(worldTarget);
            
            if(dist < 0.2) {
                //Legs still
                leftLegF.current.rotation.x = 0;
                rightLegF.current.rotation.x = 0;
                leftLegB.current.rotation.x = 0;
                rightLegB.current.rotation.x = 0;
            }
          }
      }
  });

  const coatColor = "#4A3728"; // Dark Brown
  const showHealth = hp < maxHp && hp > 0;

  // Scale factor: Bear is 1.5x bigger
  return (
    <group ref={group} position={position} rotation={rotation} scale={[1.5, 1.5, 1.5]}>
      <Html position={[0, 1.3, 0]} center>
          {showHealth && (
              <div style={{ width: '60px', height: '8px', background: 'red', border: '1px solid black' }}>
                  <div style={{ width: `${(hp/maxHp)*100}%`, height: '100%', background: 'lime' }} />
              </div>
          )}
      </Html>

      {/* Body - Bear is chonky */}
      <mesh position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[0.45, 0.4, 0.7]} />
        <meshStandardMaterial color={coatColor} />
      </mesh>
      
      {/* Head */}
      <group position={[0, 0.75, 0.4]} ref={head}>
        <mesh castShadow>
            <boxGeometry args={[0.35, 0.35, 0.35]} />
            <meshStandardMaterial color={coatColor} />
        </mesh>
        {/* Ears - Rounder */}
        <mesh position={[-0.15, 0.2, -0.05]}>
            <sphereGeometry args={[0.08]} />
             <meshStandardMaterial color={coatColor} />
        </mesh>
        <mesh position={[0.15, 0.2, -0.05]}>
            <sphereGeometry args={[0.08]} />
             <meshStandardMaterial color={coatColor} />
        </mesh>
        {/* Snout */}
        <mesh position={[0, -0.05, 0.2]}>
            <boxGeometry args={[0.15, 0.12, 0.15]} />
            <meshStandardMaterial color="#2E2318" />{/* Darker snout */}
        </mesh>
      </group>

      {/* Legs - Thicker */}
      <group position={[-0.15, 0.3, 0.25]} ref={leftLegF}>
        <mesh position={[0, -0.15, 0]} castShadow>
            <boxGeometry args={[0.12, 0.35, 0.12]} />
            <meshStandardMaterial color={coatColor} />
        </mesh>
      </group>
      
      <group position={[0.15, 0.3, 0.25]} ref={rightLegF}>
        <mesh position={[0, -0.15, 0]} castShadow>
            <boxGeometry args={[0.12, 0.35, 0.12]} />
            <meshStandardMaterial color={coatColor} />
        </mesh>
      </group>
      
      <group position={[-0.15, 0.3, -0.25]} ref={leftLegB}>
        <mesh position={[0, -0.15, 0]} castShadow>
            <boxGeometry args={[0.12, 0.35, 0.12]} />
            <meshStandardMaterial color={coatColor} />
        </mesh>
      </group>
      
      <group position={[0.15, 0.3, -0.25]} ref={rightLegB}>
        <mesh position={[0, -0.15, 0]} castShadow>
            <boxGeometry args={[0.12, 0.35, 0.12]} />
            <meshStandardMaterial color={coatColor} />
        </mesh>
      </group>
      
      {/* Tail - Stubby */}
      <group position={[0, 0.55, -0.35]} ref={tail}>
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[0.08]} />
            <meshStandardMaterial color={coatColor} />
          </mesh>
      </group>
    </group>
  );
};
