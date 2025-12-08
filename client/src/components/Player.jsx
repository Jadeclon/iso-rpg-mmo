import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';
import { Text, Billboard, Html } from '@react-three/drei';
import { soundManager } from '../SoundManager';
import { useStore } from '../store';
import itemsDef from '../items.json';

const CharacterModel = ({ color, isMoving, skin, lastAttack, equipment }) => {
  const group = useRef();
  const leftLeg = useRef();
  const rightLeg = useRef();
  const leftArm = useRef();
  const rightArm = useRef();
  
  // Track previous attack to trigger sound
  const prevAttack = useRef(0);

  useFrame((state) => {
    // ... (Keep existing animation logic unchanged)
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

  // Equipment Logic
  const rightHandItem = equipment?.rightHand;
  const itemDef = itemsDef.find(i => i.id === rightHandItem);
  const visuals = itemDef?.visuals || {};

  const leftHandItem = equipment?.leftHand;
  const showShield = !!leftHandItem && itemsDef.find(i => i.id === leftHandItem)?.type === 'shield';

  const showSword = !!visuals.bladeColor || (isWarrior && !rightHandItem); // Warrior defaults or if visual exists
  const bladeColor = visuals.bladeColor || '#e0e0e0';
  const bladeLength = visuals.bladeLength || 1.1;
  const hiltColor = visuals.hiltColor || '#4a3c31';

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
         
         {showShield && (
             <group position={[-0.2, -0.3, 0]} rotation={[0, -Math.PI/2, 0]}>
                 {/* Shield Body */}
                <mesh castShadow>
                    <boxGeometry args={[0.1, 0.6, 0.5]} />
                    <meshStandardMaterial color="#8b4513" />
                </mesh>
                {/* Shield Metal Rim */}
                <mesh position={[0.02, 0, 0]}>
                    <boxGeometry args={[0.08, 0.5, 0.4]} />
                    <meshStandardMaterial color="#5a5a5a" />
                </mesh>
                {/* Handle/Strap (Visual only) */}
             </group>
         )}
      </group>
      <group position={[0.35, 1.1, 0]} ref={rightArm}>
         <mesh position={[0, -0.35, 0]} castShadow>
            <boxGeometry args={[0.15, 0.7, 0.15]} />
            <meshStandardMaterial color={shirtColor} />
         </mesh>
         
         {/* Sword */}
         {showSword && (
             <group position={[0, -0.6, 0.2]} rotation={[Math.PI/4, 0, 0]}>
                 {/* Hilt */}
                 <mesh position={[0, 0, 0]} castShadow>
                    <boxGeometry args={[0.1, 0.3, 0.1]} />
                    <meshStandardMaterial color={hiltColor} />
                 </mesh>
                 {/* Crossguard */}
                 <mesh position={[0, 0.15, 0]} castShadow>
                    <boxGeometry args={[0.3, 0.05, 0.1]} />
                    <meshStandardMaterial color="#c0c0c0" />
                 </mesh>
                 {/* Blade */}
                 <mesh position={[0, bladeLength * 0.6, 0]} castShadow>
                    <boxGeometry args={[0.08, bladeLength, 0.02]} />
                    <meshStandardMaterial color={bladeColor} />
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



export const Player = ({ position, color, skin, lastAttack, isLocal = false, hp = 100, maxHp = 100, equipment }) => {
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

  const showHealth = hp < maxHp && hp > 0;

  return (
    <group ref={ref}>
      {/* HP Bar */}
      {(showHealth || isLocal) && ( // Always show own health or if damaged
        <Html position={[0, 2.3, 0]} center>
            <div style={{ width: '60px', height: '6px', background: 'red', border: '1px solid black' }}>
                <div style={{ width: `${(hp/maxHp)*100}%`, height: '100%', background: 'lime' }} />
            </div>
        </Html>
      )}

      <CharacterModel color={color} isMoving={isMoving} skin={skin} lastAttack={lastAttack} equipment={equipment} />
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
