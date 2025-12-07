import { useMemo, useRef } from 'react';
import { useFrame, extend } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { LEVEL_DATA } from '../levelData';
import { Dog } from './Dog';

const WaterMaterial = shaderMaterial(
  { uTime: 0, uColorStart: new THREE.Color('#3366ff'), uColorEnd: new THREE.Color('#00ccff') },
  // Vertex Shader
  `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment Shader
  `
    uniform float uTime;
    uniform vec3 uColorStart;
    uniform vec3 uColorEnd;
    varying vec2 vUv;

    void main() {
      float wave = sin(vUv.x * 10.0 + uTime) * 0.5 + 0.5;
      float flow = sin(vUv.y * 10.0 - uTime * 2.0) * 0.5 + 0.5;
      
      // Combine patterns for a watery look
      float strength = (wave + flow) / 2.0;
      
      vec3 color = mix(uColorStart, uColorEnd, strength);
      
      gl_FragColor = vec4(color, 0.8);
    }
  `
);

extend({ WaterMaterial });

import { generateWaterTexture } from '../utils/generateWaterTexture';

// ... (previous imports)

const RiverMesh = () => {
    const texture = useMemo(() => {
        const canvas = generateWaterTexture();
        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(1, 10); // Repeat more along the length
        return tex;
    }, []);

    useFrame((state, delta) => {
        texture.offset.y -= delta * 0.1; // Flow along the length
    });

    const curve = useMemo(() => {
        const points = LEVEL_DATA.riverPoints.map(p => new THREE.Vector3(p[0], p[1], p[2]));
        return new THREE.CatmullRomCurve3(points);
    }, []);

    return (
        <mesh receiveShadow scale={[1, 0.02, 1]} position={[0, 0.1, 0]}>
            <tubeGeometry args={[curve, 64, 5, 8, false]} />
            <meshStandardMaterial 
                map={texture} 
                color="#88ccff" 
                transparent 
                opacity={0.8} 
                roughness={0.1} 
                metalness={0.1} 
            />
        </mesh>
    );
};


const RealisticTree = ({ position }) => {
  return (
    <group position={position}>
      {/* Trunk */}
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.15, 0.25, 1, 6]} />
        <meshStandardMaterial color="#4d2926" />
      </mesh>
      {/* Foliage Layer 1 (Bottom) */}
      <mesh position={[0, 1.2, 0]} castShadow receiveShadow>
        <coneGeometry args={[1.2, 1.5, 7]} />
        <meshStandardMaterial color="#1a472a" roughness={0.8} />
      </mesh>
      {/* Foliage Layer 2 (Middle) */}
      <mesh position={[0, 2.2, 0]} castShadow receiveShadow>
        <coneGeometry args={[0.9, 1.5, 7]} />
        <meshStandardMaterial color="#2d5a3f" roughness={0.8} />
      </mesh>
      {/* Foliage Layer 3 (Top) */}
      <mesh position={[0, 3.2, 0]} castShadow receiveShadow>
        <coneGeometry args={[0.6, 1.5, 7]} />
        <meshStandardMaterial color="#407050" roughness={0.8} />
      </mesh>
    </group>
  );
};

const RealisticRock = ({ position, scale, rotation }) => {
    return (
        <group position={position} scale={scale} rotation={rotation}>
             {/* Main Rock */}
            <mesh position={[0, 0, 0]} castShadow receiveShadow>
                <dodecahedronGeometry args={[0.6, 0]} />
                <meshStandardMaterial color="#555555" roughness={0.9} />
            </mesh>
             {/* Side Rock */}
             <mesh position={[0.5, -0.2, 0.4]} castShadow receiveShadow>
                <dodecahedronGeometry args={[0.3, 0]} />
                <meshStandardMaterial color="#4a4a4a" roughness={0.9} />
            </mesh>
        </group>
    );
}

export const MapAssets = () => {
  return (
    <group>
      {LEVEL_DATA.trees.map(item => (
          <RealisticTree key={item.id} position={item.position} />
      ))}
      {LEVEL_DATA.rocks.map(item => (
          <RealisticRock key={item.id} position={item.position} scale={item.scale} rotation={item.rotation} />
      ))}
      {LEVEL_DATA.dogs.map(item => (
          <Dog key={item.id} position={item.position} rotation={item.rotation} />
      ))}
      <RiverMesh />
    </group>
  );
};
