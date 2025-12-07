import { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3, Quaternion, Matrix4 } from 'three';

export const Dog = ({ position, rotation = [0, 0, 0] }) => {
  const group = useRef();
  const head = useRef();
  const tail = useRef();
  const leftLegF = useRef();
  const rightLegF = useRef();
  const leftLegB = useRef();
  const rightLegB = useRef();
  
  // State for behavior
  const behavior = useRef('idle'); // idle, walk, eat
  const nextChange = useRef(0);
  const targetPos = useRef(new Vector3(...position));
  const homePos = useMemo(() => new Vector3(...position), []);
  const currentPos = useRef(new Vector3(...position));
  
  // Random offset for animations so they don't all sync up
  const offset = useMemo(() => Math.random() * 100, []);
  
  useFrame((state, delta) => {
      const now = state.clock.getElapsedTime();
      
      // State Machine
      if (now > nextChange.current) {
          const r = Math.random();
          if (r < 0.3) {
              behavior.current = 'eat';
              nextChange.current = now + 2 + Math.random() * 3;
          } else if (r < 0.6) {
              behavior.current = 'walk';
              // Pick random spot near home
              const angle = Math.random() * Math.PI * 2;
              const rad = Math.random() * 8; // Wandering radius
              targetPos.current.set(
                  homePos.x + Math.sin(angle) * rad,
                  position[1],
                  homePos.z + Math.cos(angle) * rad
              );
              nextChange.current = now + 3 + Math.random() * 3;
          } else {
              behavior.current = 'idle';
              nextChange.current = now + 2 + Math.random() * 4;
          }
      }
      
      // Behaviors
      const t = now + offset;
      
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
          // Move
          const direction = targetPos.current.clone().sub(group.current.position);
          direction.y = 0;
          if (direction.length() > 0.1) {
              direction.normalize();
              // Move
              group.current.position.add(direction.multiplyScalar(delta * 1.5)); // Speed 1.5
              // Rotate to face
              const angle = Math.atan2(direction.x, direction.z);
              // Smooth rotation could be nice but instant is okay for now or simple lerp
              group.current.rotation.y = angle;
          } else {
              // Reached target, switch to idle early
              behavior.current = 'idle';
          }
          
          // Head up
          head.current.rotation.x = Math.sin(t * 0.3) * 0.1;

          // Leg animation
          leftLegF.current.rotation.x = Math.sin(t * 12) * 0.5;
          rightLegF.current.rotation.x = Math.sin(t * 12 + Math.PI) * 0.5;
          leftLegB.current.rotation.x = Math.sin(t * 12 + Math.PI) * 0.5;
          rightLegB.current.rotation.x = Math.sin(t * 12) * 0.5;
          
      } else {
          // IDLE
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
      
      // Breathing body
      // group.current.position.y is controlled by walk? 
      // Walk stays on ground (y=0 or whatever). 
      // Breathing changes Y scale or position? position Y is tricky if walking.
      // Let's just slight Y offset relative to ground?
      // Actually group.position is absolute world. 
      // Let's leave Y alone or simple wobble if idle.
  });

  const coatColor = "#8B4513"; // SaddleBrown

  return (
    <group ref={group} position={position} rotation={rotation}>
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
