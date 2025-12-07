import { useRef, useState, useMemo } from 'react';
import { useStore } from '../store';
import { useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';
import { Text, Billboard } from '@react-three/drei';
import { socket } from './SocketManager';

const WizardModel = ({ isMoving }) => {
    const group = useRef();
    const leftArm = useRef();
    const rightArm = useRef();
    const leftLeg = useRef();
    const rightLeg = useRef();
    
    useFrame((state) => {
        const time = state.clock.getElapsedTime();
        if (isMoving) {
            // Walking
            leftLeg.current.rotation.x = Math.sin(time * 8) * 0.5;
            rightLeg.current.rotation.x = Math.sin(time * 8 + Math.PI) * 0.5;
            leftArm.current.rotation.x = Math.sin(time * 8 + Math.PI) * 0.5;
            rightArm.current.rotation.x = Math.sin(time * 8) * 0.5;
        } else {
            // Idle breathing
            leftArm.current.rotation.z = Math.sin(time * 2) * 0.1;
            rightArm.current.rotation.z = -Math.sin(time * 2) * 0.1;
            leftLeg.current.rotation.x = 0;
            rightLeg.current.rotation.x = 0;
        }
    });

    return (
        <group ref={group}>
            {/* Hat */}
            <mesh position={[0, 1.8, 0]} castShadow>
                <coneGeometry args={[0.3, 0.6, 16]} />
                <meshStandardMaterial color="#4B0082" /> {/* Indigo Hat */}
            </mesh>
            <mesh position={[0, 1.5, 0]}>
                 <cylinderGeometry args={[0.5, 0.5, 0.05, 16]} />
                 <meshStandardMaterial color="#4B0082" /> {/* Hat Brim */}
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
                <meshStandardMaterial color="#800080" /> {/* Purple Robe */}
            </mesh>

            {/* Arms */}
            <group position={[-0.35, 1.1, 0]} ref={leftArm}>
                <mesh position={[0, -0.3, 0]}>
                    <boxGeometry args={[0.15, 0.7, 0.15]} />
                    <meshStandardMaterial color="#9370DB" /> {/* Medium Purple */}
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

            {/* Legs (Hidden mostly by robe, but good for walking anim) */}
             <group position={[-0.15, 0.5, 0]} ref={leftLeg}>
                 <mesh position={[0, -0.5, 0]}>
                    <boxGeometry args={[0.15, 0.6, 0.15]} />
                    <meshStandardMaterial color="#222" />
                </mesh>
            </group>
             <group position={[0.15, 0.5, 0]} ref={rightLeg}>
                 <mesh position={[0, -0.5, 0]}>
                    <boxGeometry args={[0.15, 0.6, 0.15]} />
                    <meshStandardMaterial color="#222" />
                </mesh>
            </group>
        </group>
    );
};

export const Trader = () => {
    const trader = useStore((state) => state.trader);
    const myId = socket.id;
    const players = useStore((state) => state.players);
    const me = players[myId];

    const group = useRef();
    const [isMoving, setIsMoving] = useState(false);
    const [isClose, setIsClose] = useState(false);

    useFrame((state, delta) => {
        if (!trader || !group.current) return;

        // Interpolation
        const targetPos = new Vector3(trader.position.x, 0, trader.position.z);
        const currentPos = group.current.position;
        const dist = currentPos.distanceTo(targetPos);

        currentPos.lerp(targetPos, delta * 3); // Slower lerp for smoother anim
        
        // Rotation
        if (dist > 0.01) { // Lower threshold
             // Look directly at target
             group.current.lookAt(targetPos.x, group.current.position.y, targetPos.z);
             setIsMoving(true);
        } else {
             setIsMoving(false);
        }

        // Check distance to player for UI
        if (me) {
             const myPos = new Vector3(...me.position);
             const distToPlayer = currentPos.distanceTo(myPos);
             setIsClose(distToPlayer < 4.0);
        }
    });

    if (!trader) return null;

    return (
        <group ref={group} position={[trader.position.x, 0, trader.position.z]}>
            <group rotation={[0, Math.PI, 0]}> 
                <WizardModel isMoving={isMoving} />
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
                        {/* Background for text */}
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
