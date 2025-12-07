import { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3, Quaternion, Matrix4 } from 'three';
import { Html } from '@react-three/drei';
import { socket } from './SocketManager';

export const Bear = ({ id, position, rotation = [0, 0, 0], hp = 200, maxHp = 200, state = 'idle', wanderTarget }) => {
  const group = useRef();
  const head = useRef();
  const tail = useRef();
  const leftLegF = useRef();
  const rightLegF = useRef();
  const leftLegB = useRef();
  const rightLegB = useRef();
  
  // State for behavior
  const behavior = useRef('idle');
  
  const targetPos = useRef(new Vector3(...position));
  
  useEffect(() => {
     if (Array.isArray(position)) {
        targetPos.current.set(position[0], position[1], position[2]);
     } else {
        targetPos.current.set(position.x, position.y || 0, position.z);
     }
  }, [position]);

  const offset = useMemo(() => Math.random() * 100, []);
  
  useFrame((stateCtx, delta) => {
      const now = stateCtx.clock.getElapsedTime();
      const t = now + offset;
      
      if (group.current) {
         const lerpFactor = Math.min(delta * 10, 1);
         group.current.position.lerp(targetPos.current, lerpFactor); 
         if (rotation && rotation.length >= 2) {
            group.current.rotation.y = rotation[1];
         }
         
         if (state === 'angry') { 
             behavior.current = 'run';
         } else {
             behavior.current = 'idle'; 
         }
      }

      // Behaviors Animation
      if (behavior.current === 'run') {
          // Head up
          head.current.rotation.x = Math.sin(t * 0.3) * 0.1;

          // Leg animation - Slower, heavier stride than dog
          const speedFactor = 15; 
          leftLegF.current.rotation.x = Math.sin(t * speedFactor) * 0.5;
          rightLegF.current.rotation.x = Math.sin(t * speedFactor + Math.PI) * 0.5;
          leftLegB.current.rotation.x = Math.sin(t * speedFactor + Math.PI) * 0.5;
          rightLegB.current.rotation.x = Math.sin(t * speedFactor) * 0.5;
          
          // Body Dynamic
          // Bobbing
          group.current.position.y = position[1] + Math.abs(Math.sin(t * speedFactor)) * 0.08;
          // Tilt forward
          group.current.rotation.x = 0.05;

      } else {
          // IDLE
          group.current.rotation.x = 0;
          if (Math.abs(group.current.position.y - position[1]) > 0.001) {
              group.current.position.y = position[1]; 
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
            
            // Re-use logic for checking if we stopped moving, though server drives position
            // We can just rely on the fact that if wanderTarget is set, we are moving.
            
            // Check if actually close to target/stopped moving to stop legs? 
            // The server sets wanderTarget to null when reached.
          } else {
               //Legs still
               leftLegF.current.rotation.x = 0;
               rightLegF.current.rotation.x = 0;
               leftLegB.current.rotation.x = 0;
               rightLegB.current.rotation.x = 0;
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
