import { Canvas } from '@react-three/fiber';
import { IsometricCamera } from './IsometricCamera';
import { SocketManager } from './SocketManager';
import { World } from './World';
import { Experience } from './Experience';

import { useStore } from '../store';

export const GameCanvas = () => {
  const isNight = useStore((state) => state.isNight);

  return (
    <>
      <SocketManager />
      <Canvas shadows>
        <color attach="background" args={[isNight ? '#171717' : '#87CEEB']} />
        <IsometricCamera />
        <ambientLight intensity={isNight ? 0.5 : 1.2} />
        <directionalLight 
            position={[10, 10, 5]} 
            intensity={isNight ? 1 : 2.5} 
            castShadow 
            shadow-mapSize={[1024, 1024]} 
        />
        <Experience />
      </Canvas>
    </>
  );
};
