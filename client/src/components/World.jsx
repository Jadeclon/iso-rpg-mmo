import { MapAssets } from './MapAssets';
import { useTexture } from '@react-three/drei';
import { RepeatWrapping } from 'three';
import { useStore } from '../store';

export const World = () => {
  const showGrid = useStore((state) => state.showGrid);
  const grassTexture = useTexture('/textures/grass.png?v=6');
  grassTexture.wrapS = RepeatWrapping;
  grassTexture.wrapT = RepeatWrapping;
  grassTexture.repeat.set(100, 100);

  return (
    <group>
      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial map={grassTexture} />
      </mesh>
      
      {/* Grid Helper */}
      {showGrid && <gridHelper args={[200, 200, '#3a6b02', '#4c8a03']} position={[0, -0.09, 0]} opacity={0.3} transparent />}
      
      <MapAssets />
    </group>
  );
};
