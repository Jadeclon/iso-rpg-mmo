import { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3, Quaternion, Matrix4 } from 'three';
import { Html } from '@react-three/drei';
import { socket } from './SocketManager';

export const Dog = ({ id, position, rotation = [0, 0, 0], hp = 100, maxHp = 100, state = 'idle' }) => {
  const group = useRef();
  const head = useRef();
  const tail = useRef();
  const leftLegF = useRef();
  const rightLegF = useRef();
  const leftLegB = useRef();
  const rightLegB = useRef();
  
  // State for behavior - Server overrides this for Angry/Idle, but local animation still needed
  const behavior = useRef('idle'); // idle, walk, eat
  
  // For smoothing server updates
  const targetPos = useRef(new Vector3(...position));
  
  useEffect(() => {
    targetPos.current.set(position[0], position[1], position[2]);
  }, [position]);

  // Random offset for animations so they don't all sync up
  const offset = useMemo(() => Math.random() * 100, []);

  // Handle click to attack
  const handleClick = (e) => {
    e.stopPropagation();
    socket.emit('attackDog', id);
  };
  
  useFrame((stateCtx, delta) => {
      const now = stateCtx.clock.getElapsedTime();
      const t = now + offset;
      
      // Interpolate position from server
      if (group.current) {
         // Use a fixed factor for consistent speed regardless of framerate, 
         // but since lerp alpha is 0-1, using delta * factor makes it framerate INDEPENDENT regarding speed/time.
         // delta * 10 means it covers distance in ~0.1s.
         group.current.position.lerp(targetPos.current, delta * 10); 
         
         group.current.rotation.y = rotation[1]; 
         
         // Logic: If server says ANGRY, we are likely moving/chasing -> WALK
         // OR if we are far from target -> WALK
         const dist = group.current.position.distanceTo(targetPos.current);
         
         if (state === 'angry' || dist > 0.05) {
             behavior.current = 'walk';
         } else {
             behavior.current = 'idle'; 
         }
      }

      // Behaviors Animation
      if (behavior.current === 'eat') {
          // Head down
          head.current.rotation.x = 0.5 + Math.sin(t * 10) * 0.1; // Bobbing while eating
          head.current.rotation.y = 0;
          // Legs still
          leftLegF.current.rotation.x = 0;
          rightLegF.current.rotation.x = 0;
          leftLegB.current.rotation.x = 0;
          rightLegB.current.rotation.x = 0;
          
      } else if (behavior.current === 'walk') {
          // Head up
          head.current.rotation.x = Math.sin(t * 0.3) * 0.1;

          // Leg animation - Faster stride
          const speedFactor = 20; 
          leftLegF.current.rotation.x = Math.sin(t * speedFactor) * 0.6;
          rightLegF.current.rotation.x = Math.sin(t * speedFactor + Math.PI) * 0.6;
          leftLegB.current.rotation.x = Math.sin(t * speedFactor + Math.PI) * 0.6;
          rightLegB.current.rotation.x = Math.sin(t * speedFactor) * 0.6;
          
          // Body Dynamic
          // Bobbing
          group.current.position.y = position[1] + Math.abs(Math.sin(t * speedFactor)) * 0.05;
          // Tilt forward
          group.current.rotation.x = 0.1;

      } else {
          // IDLE
          // Reset tilt and height
          group.current.rotation.x = 0;
          if (Math.abs(group.current.position.y - position[1]) > 0.001) {
              group.current.position.y = position[1]; // Snap back or lerp
          }
          
          // Head look around
          head.current.rotation.y = Math.sin(t * 0.5) * 0.3;
          head.current.rotation.x = Math.sin(t * 0.3) * 0.05;
          
          // Legs still
          leftLegF.current.rotation.x = 0;
          rightLegF.current.rotation.x = 0;
          leftLegB.current.rotation.x = 0;
          rightLegB.current.rotation.x = 0;
      }

      // Tail wag (always wag a bit, more when happy/eating?)
      const wagSpeed = behavior.current === 'eat' ? 15 : 8;
      tail.current.rotation.z = Math.sin(t * wagSpeed) * 0.5;
  });

  const coatColor = "#8B4513"; // SaddleBrown
  const showHealth = hp < maxHp && hp > 0;

  return (
    <group ref={group} position={position} rotation={rotation} onClick={handleClick}>
      <Html position={[0, 1.2, 0]} center>
          {showHealth && (
              <div style={{ width: '50px', height: '6px', background: 'red', border: '1px solid black' }}>
                  <div style={{ width: `${(hp/maxHp)*100}%`, height: '100%', background: 'lime' }} />
              </div>
          )}
      </Html>

      {/* Body */}
      <mesh position={[0, 0.4, 0]} castShadow>
        <boxGeometry args={[0.3, 0.3, 0.5]} />
        <meshStandardMaterial color={coatColor} />
      </mesh>
      
      {/* Head */}
      <group position={[0, 0.65, 0.3]} ref={head}>
        <mesh castShadow>
            <boxGeometry args={[0.25, 0.25, 0.25]} />
            <meshStandardMaterial color={coatColor} />
        </mesh>
        {/* Ears */}
        <mesh position={[-0.1, 0.15, 0]}>
            <boxGeometry args={[0.08, 0.1, 0.05]} />
             <meshStandardMaterial color={coatColor} />
        </mesh>
        <mesh position={[0.1, 0.15, 0]}>
            <boxGeometry args={[0.08, 0.1, 0.05]} />
             <meshStandardMaterial color={coatColor} />
        </mesh>
        {/* Snout */}
        <mesh position={[0, -0.05, 0.15]}>
            <boxGeometry args={[0.12, 0.1, 0.1]} />
            <meshStandardMaterial color="black" />
        </mesh>
      </group>

      {/* Legs */}
      <group position={[-0.1, 0.3, 0.2]} ref={leftLegF}>
        <mesh position={[0, -0.15, 0]} castShadow>
            <boxGeometry args={[0.08, 0.3, 0.08]} />
            <meshStandardMaterial color={coatColor} />
        </mesh>
      </group>
      
      <group position={[0.1, 0.3, 0.2]} ref={rightLegF}>
        <mesh position={[0, -0.15, 0]} castShadow>
            <boxGeometry args={[0.08, 0.3, 0.08]} />
            <meshStandardMaterial color={coatColor} />
        </mesh>
      </group>
      
      <group position={[-0.1, 0.3, -0.2]} ref={leftLegB}>
        <mesh position={[0, -0.15, 0]} castShadow>
            <boxGeometry args={[0.08, 0.3, 0.08]} />
            <meshStandardMaterial color={coatColor} />
        </mesh>
      </group>
      
      <group position={[0.1, 0.3, -0.2]} ref={rightLegB}>
        <mesh position={[0, -0.15, 0]} castShadow>
            <boxGeometry args={[0.08, 0.3, 0.08]} />
            <meshStandardMaterial color={coatColor} />
        </mesh>
      </group>
      
      {/* Tail */}
      <group position={[0, 0.5, -0.25]} ref={tail}>
          <mesh position={[0, 0.1, -0.1]} rotation={[Math.PI/4, 0, 0]}>
            <boxGeometry args={[0.05, 0.3, 0.05]} />
            <meshStandardMaterial color={coatColor} />
          </mesh>
      </group>
    </group>
  );
};
