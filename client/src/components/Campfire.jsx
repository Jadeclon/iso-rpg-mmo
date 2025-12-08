import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

export const Campfire = ({ position }) => {
  const fireRef = useRef();

  useFrame((state) => {
      const t = state.clock.getElapsedTime();
      if (fireRef.current) {
          fireRef.current.scale.setScalar(0.8 + Math.sin(t * 10) * 0.2);
          fireRef.current.position.y = 0.3 + Math.sin(t * 15) * 0.05;
      }
  });

  return (
    <group position={position}>
       {/* Logs */}
       <mesh position={[0, 0.1, 0]} rotation={[0, 0, Math.PI/2]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 0.6]} />
          <meshStandardMaterial color="#3e2723" />
       </mesh>
       <mesh position={[0, 0.1, 0]} rotation={[0, Math.PI/2, Math.PI/2]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 0.6]} />
          <meshStandardMaterial color="#3e2723" />
       </mesh>
       
       {/* Fire (Simple low poly representation) */}
       <mesh ref={fireRef} position={[0, 0.3, 0]}>
           <dodecahedronGeometry args={[0.25, 0]} />
           <meshStandardMaterial color="orange" emissive="red" emissiveIntensity={2} />
       </mesh>
       
       {/* Light */}
       <pointLight position={[0, 0.5, 0]} distance={5} intensity={5} color="orange" castShadow />
    </group>
  );
};
