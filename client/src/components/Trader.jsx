import { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';
import { Text, Billboard } from '@react-three/drei';
import { useStore } from '../store';
import { socket } from './SocketManager';

export const Trader = ({ id, position, rotation = [0, 0, 0], hp = 100, maxHp = 100, state = 'idle', wanderTarget }) => {
  const group = useRef();
  const leftLeg = useRef();
  const rightLeg = useRef();
  const leftArm = useRef();
  const rightArm = useRef();
  
  const players = useStore((state) => state.players);
  const myId = socket.id;
  const me = players[myId];
  const [isClose, setIsClose] = useState(false); // Unique Trader feature

  // State for behavior - Server overrides this for Angry/Idle, but local animation still needed
  const behavior = useRef('idle'); 

  // For smoothing server updates
  const targetPos = useRef(new Vector3(...position));
  
  useEffect(() => {
     if (Array.isArray(position)) {
        targetPos.current.set(position[0], position[1], position[2]);
     } else {
        targetPos.current.set(position.x, position.y || 0, position.z);
     }
  }, [position]);

  // Random offset for animations so they don't all sync up
  const offset = useMemo(() => Math.random() * 100, []);
  const worldTarget = useMemo(() => new Vector3(), []);
  const playerPosVector = useMemo(() => new Vector3(), []); // Keep optimization

  useFrame((stateCtx, delta) => {
      const now = stateCtx.clock.getElapsedTime();
      const t = now + offset;
      
      // Interpolate position from server
      if (group.current) {
         const prevPos = group.current.position.clone();

         // Use a fixed factor for consistent speed regardless of framerate         const lerpFactor = Math.min(delta * 10, 1);
         const lerpFactor = Math.min(delta * 10, 1);
         group.current.position.lerp(targetPos.current, lerpFactor); 
         if (rotation && rotation.length >= 2) {
            group.current.rotation.y = rotation[1];
         }
         
         // Behavior determination (Blueprint: Dog)
         // 'angry' logic mapped to just 'run' for Trader to keep consistency, though Trader isn't angry
         if (state === 'angry') { 
             behavior.current = 'run';
         } else {
             behavior.current = 'idle'; 
         }
      }

      // Behavior Animations
      if (behavior.current === 'run') {
           // Walking - matches Dog 'run' frequency but adapted for bipedal
           const speedFactor = 10; 
           leftLeg.current.rotation.x = Math.sin(t * speedFactor) * 0.5;
           rightLeg.current.rotation.x = Math.sin(t * speedFactor + Math.PI) * 0.5;
           leftArm.current.rotation.x = Math.sin(t * speedFactor + Math.PI) * 0.5;
           rightArm.current.rotation.x = Math.sin(t * speedFactor) * 0.5;
           
           // Slight bob
           group.current.position.y = (position[1] || 0) + Math.abs(Math.sin(t * speedFactor)) * 0.02;

      } else {
           // IDLE
           if (Math.abs(group.current.position.y - (position[1] || 0)) > 0.001) {
               group.current.position.y = position[1] || 0; 
           }
           




           
           if (wanderTarget) {
            // Leg animation - Faster stride
            const speedFactor = 5; 
            leftLeg.current.rotation.x = Math.sin(t * speedFactor) * 0.6;
            rightLeg.current.rotation.x = Math.sin(t * speedFactor + Math.PI) * 0.6;
            leftArm.current.rotation.x = Math.sin(t * speedFactor + Math.PI) * 0.6;
            rightArm.current.rotation.x = Math.sin(t * speedFactor) * 0.6;

              worldTarget.set(wanderTarget.x, group.current.position.y, wanderTarget.z);
              const dist = group.current.position.distanceTo(worldTarget);

              if(dist < 0.2) {
                  //Legs still
                  leftLeg.current.rotation.x = 0;
                  rightLeg.current.rotation.x = 0;
                  leftArm.current.rotation.x = 0;
                  rightArm.current.rotation.x = 0;
                  console.log('legs still');
              }
          }
      }

      // Unique Trader Feature: UI Distance Check
      if (me) {
          playerPosVector.set(...me.position);
          const distToPlayer = group.current.position.distanceTo(playerPosVector);
          setIsClose(distToPlayer < 4.0);
      }
  });

  return (
    <group ref={group} position={position} rotation={rotation}>
        {/* Hat */}
        <mesh position={[0, 1.8, 0]} castShadow>
            <coneGeometry args={[0.3, 0.6, 16]} />
            <meshStandardMaterial color="#4B0082" /> 
        </mesh>
        <mesh position={[0, 1.5, 0]}>
                <cylinderGeometry args={[0.5, 0.5, 0.05, 16]} />
                <meshStandardMaterial color="#4B0082" /> 
        </mesh>
        
        {/* Head */}
        <mesh position={[0, 1.3, 0]}>
            <boxGeometry args={[0.35, 0.35, 0.35]} />
            <meshStandardMaterial color="#ffccaa" />
        </mesh>
        {/* Beard */}
            <mesh position={[0, 1.2, 0.18]}>
            <boxGeometry args={[0.3, 0.25, 0.1]} />
            <meshStandardMaterial color="white" />
        </mesh>

        {/* Robe (Body) */}
        <mesh position={[0, 0.7, 0]} castShadow>
            <boxGeometry args={[0.55, 1.0, 0.35]} />
            <meshStandardMaterial color="#800080" /> 
        </mesh>

        {/* Arms */}
        <group position={[-0.35, 1.1, 0]} ref={leftArm}>
            <mesh position={[0, -0.3, 0]}>
                <boxGeometry args={[0.15, 0.7, 0.15]} />
                <meshStandardMaterial color="#9370DB" /> 
            </mesh>
        </group>
        <group position={[0.35, 1.1, 0]} ref={rightArm}>
                <mesh position={[0, -0.3, 0]}>
                <boxGeometry args={[0.15, 0.7, 0.15]} />
                <meshStandardMaterial color="#9370DB" />
            </mesh>
            {/* Staff */}
            <group position={[0, -0.6, 0.2]} rotation={[0.2, 0, 0]}>
                <mesh position={[0, 0.4, 0]}>
                        <cylinderGeometry args={[0.03, 0.03, 1.5, 8]} />
                        <meshStandardMaterial color="#8B4513" />
                </mesh>
                <mesh position={[0, 1.2, 0]}>
                    <dodecahedronGeometry args={[0.15]} />
                    <meshStandardMaterial color="gold" emissive="gold" emissiveIntensity={0.5} />
                </mesh>
            </group>
        </group>

        {/* Legs */}
            <group position={[-0.15, 0.5, 0]} ref={leftLeg}>
                <mesh position={[0, -0.25, 0]}>
                <boxGeometry args={[0.15, 0.5, 0.15]} />
                <meshStandardMaterial color="#222" />
            </mesh>
        </group>
            <group position={[0.15, 0.5, 0]} ref={rightLeg}>
                <mesh position={[0, -0.25, 0]}>
                <boxGeometry args={[0.15, 0.5, 0.15]} />
                <meshStandardMaterial color="#222" />
            </mesh>
        </group>
        
        {/* Name Tag */}
        <Billboard position={[0, 2.5, 0]}>
            <Text
                fontSize={0.3}
                color="gold"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.02}
                outlineColor="black"
            >
                Trader
            </Text>
        </Billboard>
        
        {/* Interact Prompt */}
        {isClose && (
                <Billboard position={[0, 2.1, 0]}>
                    <group>
                    <mesh position={[0, 0, -0.01]}>
                        <planeGeometry args={[1.8, 0.4]} />
                        <meshBasicMaterial color="black" transparent opacity={0.6} />
                    </mesh>
                    <Text
                        fontSize={0.2}
                        color="white"
                        anchorX="center"
                        anchorY="middle"
                    >
                        Press [T] to Trade
                    </Text>
                    </group>
            </Billboard>
        )}
    </group>
  );
};
