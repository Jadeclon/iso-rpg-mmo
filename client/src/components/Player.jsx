import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';
import { Text, Billboard } from '@react-three/drei';
import { soundManager } from '../SoundManager';
import { useStore } from '../store';

const CharacterModel = ({ color, isMoving, skin, lastAttack }) => {
  const group = useRef();
  const leftLeg = useRef();
  const rightLeg = useRef();
  const leftArm = useRef();
  const rightArm = useRef();
  
  // Track previous attack to trigger sound
  const prevAttack = useRef(0);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const now = Date.now();
    const isAttacking = lastAttack && (now - lastAttack < 300);
    
    // Trigger sound on new attack
    if (lastAttack && lastAttack !== prevAttack.current && isAttacking) {
        soundManager.playAttackSound();
        prevAttack.current = lastAttack;
    }

    if (isAttacking) {
        // Attack animation (Simple Chop)
        const progress = (now - lastAttack) / 300; 
        
        // Simple chop: Up slightly, then down hard
        // 0 -> 1
        // Start: -45 deg (default idle)
        // Wind up: -90 deg
        // Strike: 0 deg
        
        if (progress < 0.3) {
            // Wind up
             rightArm.current.rotation.x = -Math.PI/3 * (progress / 0.3);
        } else {
            // Strike
             rightArm.current.rotation.x = Math.PI/2 * ((progress - 0.3) / 0.7);
        }
        
        rightArm.current.rotation.y = 0;
        rightArm.current.rotation.z = 0;
        
        // Reset others
        leftLeg.current.rotation.x = 0;
        rightLeg.current.rotation.x = 0;
        leftArm.current.rotation.x = 0;
    } else if (isMoving) {
      // Walking animation
      leftLeg.current.rotation.x = Math.sin(time * 10) * 0.5;
      rightLeg.current.rotation.x = Math.sin(time * 10 + Math.PI) * 0.5;
      leftArm.current.rotation.x = Math.sin(time * 10 + Math.PI) * 0.5;
      rightArm.current.rotation.x = Math.sin(time * 10) * 0.5;
    } else {
      // Idle pose
      leftLeg.current.rotation.x = 0;
      rightLeg.current.rotation.x = 0;
      leftArm.current.rotation.x = 0;
      rightArm.current.rotation.x = 0;
    }
  });

  const isWarrior = skin === 'warrior';
  const shirtColor = isWarrior ? '#a0a0a0' : color; // Chainmail for warrior
  const pantsColor = isWarrior ? '#606060' : '#333'; // Greaves for warrior

  return (
    <group ref={group}>
      {/* Head */}
      <mesh position={[0, 1.4, 0]} castShadow>
        <boxGeometry args={[0.4, 0.4, 0.4]} />
        <meshStandardMaterial color="#ffccaa" />
      </mesh>
      
      {/* Helmet (Warrior only) */}
      {isWarrior && (
          <mesh position={[0, 1.55, 0]} castShadow>
            <boxGeometry args={[0.45, 0.2, 0.45]} />
            <meshStandardMaterial color="#707070" />
          </mesh>
      )}

      {/* Torso */}
      <mesh position={[0, 0.85, 0]} castShadow>
        <boxGeometry args={[0.5, 0.7, 0.3]} />
        <meshStandardMaterial color={shirtColor} />
      </mesh>
      
      {/* Arms */}
      <group position={[-0.35, 1.1, 0]} ref={leftArm}>
         <mesh position={[0, -0.35, 0]} castShadow>
            <boxGeometry args={[0.15, 0.7, 0.15]} />
            <meshStandardMaterial color={shirtColor} />
         </mesh>
      </group>
      <group position={[0.35, 1.1, 0]} ref={rightArm}>
         <mesh position={[0, -0.35, 0]} castShadow>
            <boxGeometry args={[0.15, 0.7, 0.15]} />
            <meshStandardMaterial color={shirtColor} />
         </mesh>
         
         {/* Sword (Warrior only) */}
         {isWarrior && (
             <group position={[0, -0.6, 0.2]} rotation={[Math.PI/4, 0, 0]}>
                 {/* Hilt */}
                 <mesh position={[0, 0, 0]} castShadow>
                    <boxGeometry args={[0.1, 0.3, 0.1]} />
                    <meshStandardMaterial color="#4a3c31" />
                 </mesh>
                 {/* Crossguard */}
                 <mesh position={[0, 0.15, 0]} castShadow>
                    <boxGeometry args={[0.3, 0.05, 0.1]} />
                    <meshStandardMaterial color="#c0c0c0" />
                 </mesh>
                 {/* Blade */}
                 <mesh position={[0, 0.7, 0]} castShadow>
                    <boxGeometry args={[0.08, 1.1, 0.02]} />
                    <meshStandardMaterial color="#e0e0e0" />
                 </mesh>
             </group>
         )}
      </group>
      {/* Legs */}
      <group position={[-0.15, 0.5, 0]} ref={leftLeg}>
         <mesh position={[0, -0.25, 0]} castShadow>
            <boxGeometry args={[0.18, 0.5, 0.18]} />
            <meshStandardMaterial color={pantsColor} />
         </mesh>
      </group>
      <group position={[0.15, 0.5, 0]} ref={rightLeg}>
         <mesh position={[0, -0.25, 0]} castShadow>
            <boxGeometry args={[0.18, 0.5, 0.18]} />
            <meshStandardMaterial color={pantsColor} />
         </mesh>
      </group>
    </group>
  );
};



export const Player = ({ position, color, skin, lastAttack, isLocal = false }) => {
  const ref = useRef();
  const [isMoving, setIsMoving] = useState(false);
  
  useFrame((state, delta) => {
    if (ref.current) {
        const target = new Vector3(...position);
        const dist = ref.current.position.distanceTo(target);
        
        // simple interpolation
        ref.current.position.lerp(target, 0.2);

        // Check motion for animation
        setIsMoving(dist > 0.1);
        
        // Rotate to face movement direction
        if (dist > 0.05) {
             const direction = target.clone().sub(ref.current.position);
             const angle = Math.atan2(direction.x, direction.z);
             ref.current.rotation.y = angle;
        }
    }
  });

  return (
    <group ref={ref}>
      <CharacterModel color={color} isMoving={isMoving} skin={skin} lastAttack={lastAttack} />
      {/* Name Tag */}
      <Billboard position={[0, 2.0, 0]}>
        <Text
          fontSize={0.4}
          color="white"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="black"
        >
          {isLocal ? "You" : "Player"}
        </Text>
      </Billboard>
    </group>
  );
};
