import { memo, useMemo } from 'react';
import { useFrame, extend } from '@react-three/fiber';
import { shaderMaterial, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { LEVEL_DATA } from '../levelData';
import { generateWaterTexture } from '../utils/generateWaterTexture';
import { RepeatWrapping } from 'three';

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


const RealisticTree = memo(({ position }) => {
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
});

const RealisticRock = memo(({ position, scale, rotation }) => {
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
});

const FantasyHouse = memo(() => {
    return (
        <group position={[-35, 0, 25]}>
            {/* === STONE FOUNDATION === */}
            <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
                <boxGeometry args={[9, 0.8, 9]} />
                <meshStandardMaterial color="#4a4a4a" roughness={0.9} />
            </mesh>
            
            {/* === MAIN BUILDING - First Floor (Stone) === */}
            <mesh position={[0, 1.8, 0]} castShadow receiveShadow>
                <boxGeometry args={[8, 2.8, 8]} />
                <meshStandardMaterial color="#7d6b5a" roughness={0.8} />
            </mesh>
            
            {/* === TIMBER FRAMING - First Floor === */}
            {/* Vertical beams */}
            {[[-3.9, 1.8, 0], [3.9, 1.8, 0], [0, 1.8, -3.9], [0, 1.8, 3.9]].map((pos, i) => (
                <mesh key={`vbeam1-${i}`} position={pos} castShadow>
                    <boxGeometry args={[0.3, 2.8, 0.3]} />
                    <meshStandardMaterial color="#3d2817" roughness={0.7} />
                </mesh>
            ))}
            {/* Corner vertical beams */}
            {[[-3.9, 1.8, -3.9], [3.9, 1.8, -3.9], [-3.9, 1.8, 3.9], [3.9, 1.8, 3.9]].map((pos, i) => (
                <mesh key={`corner1-${i}`} position={pos} castShadow>
                    <boxGeometry args={[0.4, 2.8, 0.4]} />
                    <meshStandardMaterial color="#3d2817" roughness={0.7} />
                </mesh>
            ))}
            {/* Horizontal beam at floor divide */}
            <mesh position={[0, 3.3, 4.05]} castShadow>
                <boxGeometry args={[8.2, 0.25, 0.25]} />
                <meshStandardMaterial color="#3d2817" roughness={0.7} />
            </mesh>
            <mesh position={[0, 3.3, -4.05]} castShadow>
                <boxGeometry args={[8.2, 0.25, 0.25]} />
                <meshStandardMaterial color="#3d2817" roughness={0.7} />
            </mesh>
            <mesh position={[4.05, 3.3, 0]} castShadow>
                <boxGeometry args={[0.25, 0.25, 8.2]} />
                <meshStandardMaterial color="#3d2817" roughness={0.7} />
            </mesh>
            <mesh position={[-4.05, 3.3, 0]} castShadow>
                <boxGeometry args={[0.25, 0.25, 8.2]} />
                <meshStandardMaterial color="#3d2817" roughness={0.7} />
            </mesh>

            {/* === SECOND FLOOR (Timber & Plaster - overhangs slightly) === */}
            <mesh position={[0, 4.5, 0]} castShadow receiveShadow>
                <boxGeometry args={[8.5, 2.2, 8.5]} />
                <meshStandardMaterial color="#d4c4a8" roughness={0.6} />
            </mesh>
            
            {/* Timber framing on second floor - X pattern */}
            {/* Front face */}
            <mesh position={[-2, 4.5, 4.3]} rotation={[0, 0, Math.PI / 4]} castShadow>
                <boxGeometry args={[0.15, 2.5, 0.15]} />
                <meshStandardMaterial color="#3d2817" />
            </mesh>
            <mesh position={[-2, 4.5, 4.3]} rotation={[0, 0, -Math.PI / 4]} castShadow>
                <boxGeometry args={[0.15, 2.5, 0.15]} />
                <meshStandardMaterial color="#3d2817" />
            </mesh>
            <mesh position={[2, 4.5, 4.3]} rotation={[0, 0, Math.PI / 4]} castShadow>
                <boxGeometry args={[0.15, 2.5, 0.15]} />
                <meshStandardMaterial color="#3d2817" />
            </mesh>
            <mesh position={[2, 4.5, 4.3]} rotation={[0, 0, -Math.PI / 4]} castShadow>
                <boxGeometry args={[0.15, 2.5, 0.15]} />
                <meshStandardMaterial color="#3d2817" />
            </mesh>
            
            {/* Second floor corner beams */}
            {[[-4.2, 4.5, -4.2], [4.2, 4.5, -4.2], [-4.2, 4.5, 4.2], [4.2, 4.5, 4.2]].map((pos, i) => (
                <mesh key={`corner2-${i}`} position={pos} castShadow>
                    <boxGeometry args={[0.35, 2.2, 0.35]} />
                    <meshStandardMaterial color="#3d2817" roughness={0.7} />
                </mesh>
            ))}

            {/* === MAIN ROOF (Thatched style) === */}
            <mesh position={[0, 7, 0]} rotation={[0, Math.PI / 4, 0]} castShadow receiveShadow>
                <coneGeometry args={[7.5, 4.5, 4]} />
                <meshStandardMaterial color="#8b7355" roughness={1} />
            </mesh>
            {/* Roof trim */}
            <mesh position={[0, 5.6, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
                <cylinderGeometry args={[6.2, 6.2, 0.3, 4]} />
                <meshStandardMaterial color="#3d2817" roughness={0.7} />
            </mesh>

            {/* === WIZARD TOWER (side extension) === */}
            <group position={[-5.5, 0, -2]}>
                {/* Tower base */}
                <mesh position={[0, 3.5, 0]} castShadow receiveShadow>
                    <cylinderGeometry args={[2, 2.2, 7, 8]} />
                    <meshStandardMaterial color="#5a5a5a" roughness={0.85} />
                </mesh>
                {/* Tower spiral detail */}
                {[0, 1, 2, 3, 4, 5].map((i) => (
                    <mesh key={`spiral-${i}`} position={[Math.cos(i * 1.2) * 2.1, i * 1.1 + 0.8, Math.sin(i * 1.2) * 2.1]} castShadow>
                        <boxGeometry args={[0.3, 0.2, 0.3]} />
                        <meshStandardMaterial color="#4a4a4a" />
                    </mesh>
                ))}
                {/* Tower conical roof */}
                <mesh position={[0, 8.5, 0]} castShadow receiveShadow>
                    <coneGeometry args={[2.5, 3.5, 8]} />
                    <meshStandardMaterial color="#2d4a6d" roughness={0.5} metalness={0.1} />
                </mesh>
                {/* Tower roof spire */}
                <mesh position={[0, 10.8, 0]} castShadow>
                    <coneGeometry args={[0.2, 1.2, 6]} />
                    <meshStandardMaterial color="#ffd700" metalness={0.8} roughness={0.2} />
                </mesh>
                {/* Tower window */}
                <mesh position={[2.05, 5, 0]} rotation={[0, Math.PI / 2, 0]}>
                    <boxGeometry args={[0.8, 1.5, 0.2]} />
                    <meshStandardMaterial color="#ffeaa7" emissive="#ffcc00" emissiveIntensity={0.3} />
                </mesh>
                {/* Tower window arch */}
                <mesh position={[2.1, 5.8, 0]} rotation={[Math.PI / 2, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[0.4, 0.4, 0.15, 16, 1, false, 0, Math.PI]} />
                    <meshStandardMaterial color="#3d2817" />
                </mesh>
            </group>

            {/* === CHIMNEY === */}
            <group position={[2.5, 7, -2]}>
                <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
                    <boxGeometry args={[1.2, 3, 1.2]} />
                    <meshStandardMaterial color="#8b4513" roughness={0.9} />
                </mesh>
                {/* Chimney cap */}
                <mesh position={[0, 3.2, 0]} castShadow>
                    <boxGeometry args={[1.5, 0.3, 1.5]} />
                    <meshStandardMaterial color="#4a4a4a" />
                </mesh>
                {/* Smoke effect (static puffs) */}
                {[0, 0.6, 1.3].map((y, i) => (
                    <mesh key={`smoke-${i}`} position={[Math.sin(i) * 0.3, 3.8 + y, Math.cos(i) * 0.3]}>
                        <sphereGeometry args={[0.3 + i * 0.15, 8, 8]} />
                        <meshStandardMaterial color="#aaaaaa" transparent opacity={0.4 - i * 0.1} />
                    </mesh>
                ))}
            </group>

            {/* === FRONT DOOR (Arched) === */}
            <group position={[0, 0, 4.05]}>
                {/* Door frame */}
                <mesh position={[0, 1.6, 0]} castShadow>
                    <boxGeometry args={[2.4, 3.2, 0.3]} />
                    <meshStandardMaterial color="#2d1810" roughness={0.8} />
                </mesh>
                {/* Door */}
                <mesh position={[0, 1.5, 0.1]}>
                    <boxGeometry args={[1.8, 2.8, 0.15]} />
                    <meshStandardMaterial color="#4a2c17" roughness={0.7} />
                </mesh>
                {/* Door arch */}
                <mesh position={[0, 3, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[0.9, 0.9, 0.15, 16, 1, false, 0, Math.PI]} />
                    <meshStandardMaterial color="#4a2c17" roughness={0.7} />
                </mesh>
                {/* Door handle */}
                <mesh position={[0.6, 1.5, 0.25]}>
                    <sphereGeometry args={[0.12, 8, 8]} />
                    <meshStandardMaterial color="#b8860b" metalness={0.8} roughness={0.3} />
                </mesh>
                {/* Door studs */}
                {[[-0.5, 2.2], [0.5, 2.2], [-0.5, 0.8], [0.5, 0.8]].map(([x, y], i) => (
                    <mesh key={`stud-${i}`} position={[x, y, 0.2]}>
                        <cylinderGeometry args={[0.08, 0.08, 0.1, 8]} rotation={[Math.PI / 2, 0, 0]} />
                        <meshStandardMaterial color="#8b7355" metalness={0.6} />
                    </mesh>
                ))}
            </group>

            {/* === WINDOWS WITH SHUTTERS === */}
            {/* Front left window */}
            <group position={[-2.8, 2.2, 4.1]}>
                <mesh><boxGeometry args={[1.4, 1.4, 0.15]} /><meshStandardMaterial color="#ffeaa7" emissive="#ffcc00" emissiveIntensity={0.2} /></mesh>
                {/* Window frame */}
                <mesh position={[0, 0, 0.05]}><boxGeometry args={[1.5, 1.5, 0.1]} /><meshStandardMaterial color="#3d2817" /></mesh>
                <mesh position={[0, 0, 0.1]}><boxGeometry args={[1.3, 1.3, 0.05]} /><meshStandardMaterial color="#ffeaa7" emissive="#ffcc00" emissiveIntensity={0.2} /></mesh>
                {/* Cross bars */}
                <mesh position={[0, 0, 0.12]}><boxGeometry args={[0.08, 1.3, 0.05]} /><meshStandardMaterial color="#3d2817" /></mesh>
                <mesh position={[0, 0, 0.12]}><boxGeometry args={[1.3, 0.08, 0.05]} /><meshStandardMaterial color="#3d2817" /></mesh>
                {/* Left shutter */}
                <mesh position={[-0.95, 0, 0.1]} rotation={[0, 0.3, 0]}><boxGeometry args={[0.7, 1.5, 0.1]} /><meshStandardMaterial color="#2d5a3f" /></mesh>
                {/* Right shutter */}
                <mesh position={[0.95, 0, 0.1]} rotation={[0, -0.3, 0]}><boxGeometry args={[0.7, 1.5, 0.1]} /><meshStandardMaterial color="#2d5a3f" /></mesh>
            </group>
            
            {/* Front right window */}
            <group position={[2.8, 2.2, 4.1]}>
                <mesh><boxGeometry args={[1.4, 1.4, 0.15]} /><meshStandardMaterial color="#ffeaa7" emissive="#ffcc00" emissiveIntensity={0.2} /></mesh>
                <mesh position={[0, 0, 0.05]}><boxGeometry args={[1.5, 1.5, 0.1]} /><meshStandardMaterial color="#3d2817" /></mesh>
                <mesh position={[0, 0, 0.1]}><boxGeometry args={[1.3, 1.3, 0.05]} /><meshStandardMaterial color="#ffeaa7" emissive="#ffcc00" emissiveIntensity={0.2} /></mesh>
                <mesh position={[0, 0, 0.12]}><boxGeometry args={[0.08, 1.3, 0.05]} /><meshStandardMaterial color="#3d2817" /></mesh>
                <mesh position={[0, 0, 0.12]}><boxGeometry args={[1.3, 0.08, 0.05]} /><meshStandardMaterial color="#3d2817" /></mesh>
                <mesh position={[-0.95, 0, 0.1]} rotation={[0, 0.3, 0]}><boxGeometry args={[0.7, 1.5, 0.1]} /><meshStandardMaterial color="#2d5a3f" /></mesh>
                <mesh position={[0.95, 0, 0.1]} rotation={[0, -0.3, 0]}><boxGeometry args={[0.7, 1.5, 0.1]} /><meshStandardMaterial color="#2d5a3f" /></mesh>
            </group>
            
            {/* Second floor window (front) */}
            <group position={[0, 4.5, 4.3]}>
                <mesh><boxGeometry args={[1.8, 1.2, 0.15]} /><meshStandardMaterial color="#ffeaa7" emissive="#ffcc00" emissiveIntensity={0.25} /></mesh>
                <mesh position={[0, 0, 0.05]}><boxGeometry args={[2, 1.4, 0.1]} /><meshStandardMaterial color="#3d2817" /></mesh>
                <mesh position={[0, 0, 0.1]}><boxGeometry args={[1.7, 1.1, 0.05]} /><meshStandardMaterial color="#ffeaa7" emissive="#ffcc00" emissiveIntensity={0.25} /></mesh>
                <mesh position={[0, 0, 0.12]}><boxGeometry args={[0.08, 1.1, 0.05]} /><meshStandardMaterial color="#3d2817" /></mesh>
                <mesh position={[-0.4, 0, 0.12]}><boxGeometry args={[0.08, 1.1, 0.05]} /><meshStandardMaterial color="#3d2817" /></mesh>
                <mesh position={[0.4, 0, 0.12]}><boxGeometry args={[0.08, 1.1, 0.05]} /><meshStandardMaterial color="#3d2817" /></mesh>
            </group>

            {/* === HANGING LANTERNS === */}
            {[[-1.5, 3.1, 4.2], [1.5, 3.1, 4.2]].map((pos, i) => (
                <group key={`lantern-${i}`} position={pos}>
                    {/* Bracket */}
                    <mesh position={[0, 0.3, 0]}><boxGeometry args={[0.08, 0.6, 0.08]} /><meshStandardMaterial color="#2d1810" /></mesh>
                    <mesh position={[0, 0, 0.15]}><boxGeometry args={[0.08, 0.08, 0.3]} /><meshStandardMaterial color="#2d1810" /></mesh>
                    {/* Lantern body */}
                    <mesh position={[0, -0.3, 0.25]}>
                        <boxGeometry args={[0.25, 0.35, 0.25]} />
                        <meshStandardMaterial color="#8b4513" />
                    </mesh>
                    {/* Lantern glow */}
                    <mesh position={[0, -0.3, 0.25]}>
                        <boxGeometry args={[0.18, 0.25, 0.18]} />
                        <meshStandardMaterial color="#ffaa00" emissive="#ff8800" emissiveIntensity={0.8} />
                    </mesh>
                    {/* Lantern top */}
                    <mesh position={[0, -0.05, 0.25]}>
                        <coneGeometry args={[0.18, 0.15, 4]} />
                        <meshStandardMaterial color="#2d1810" />
                    </mesh>
                </group>
            ))}

            {/* === FLOWER BOXES === */}
            {[[-2.8, 1.4, 4.2], [2.8, 1.4, 4.2]].map((pos, i) => (
                <group key={`flowerbox-${i}`} position={pos}>
                    {/* Box */}
                    <mesh><boxGeometry args={[1.6, 0.4, 0.4]} /><meshStandardMaterial color="#5d4037" /></mesh>
                    {/* Flowers */}
                    {[-0.5, 0, 0.5].map((x, j) => (
                        <group key={`flower-${j}`} position={[x, 0.35, 0]}>
                            <mesh><sphereGeometry args={[0.15, 6, 6]} /><meshStandardMaterial color={['#ff6b6b', '#ffd93d', '#ff6b6b'][j]} /></mesh>
                            <mesh position={[0, -0.15, 0]}><cylinderGeometry args={[0.03, 0.03, 0.2, 6]} /><meshStandardMaterial color="#228b22" /></mesh>
                        </group>
                    ))}
                </group>
            ))}

            {/* === WOODEN PORCH === */}
            <group position={[0, 0, 5.5]}>
                {/* Porch floor */}
                <mesh position={[0, 0.15, 0]} receiveShadow>
                    <boxGeometry args={[6, 0.3, 2.5]} />
                    <meshStandardMaterial color="#8b7355" roughness={0.8} />
                </mesh>
                {/* Porch steps */}
                <mesh position={[0, -0.15, 1.2]} receiveShadow>
                    <boxGeometry args={[3, 0.3, 0.8]} />
                    <meshStandardMaterial color="#7a6348" roughness={0.8} />
                </mesh>
                {/* Porch posts */}
                {[[-2.5, 1.2, 1], [2.5, 1.2, 1]].map((pos, i) => (
                    <mesh key={`post-${i}`} position={pos} castShadow>
                        <boxGeometry args={[0.25, 2.4, 0.25]} />
                        <meshStandardMaterial color="#5d4037" />
                    </mesh>
                ))}
                {/* Porch beam */}
                <mesh position={[0, 2.4, 1]} castShadow>
                    <boxGeometry args={[5.5, 0.2, 0.2]} />
                    <meshStandardMaterial color="#5d4037" />
                </mesh>
                {/* Small awning */}
                <mesh position={[0, 2.6, 0.5]} rotation={[0.3, 0, 0]} castShadow>
                    <boxGeometry args={[5.5, 0.1, 1.5]} />
                    <meshStandardMaterial color="#8b7355" roughness={0.9} />
                </mesh>
            </group>

            {/* === DECORATIVE BARREL === */}
            <group position={[4.5, 0, 3.5]}>
                <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
                    <cylinderGeometry args={[0.5, 0.55, 1.2, 12]} />
                    <meshStandardMaterial color="#8b4513" roughness={0.8} />
                </mesh>
                {/* Barrel bands */}
                {[0.2, 0.6, 1].map((y, i) => (
                    <mesh key={`band-${i}`} position={[0, y, 0]}>
                        <torusGeometry args={[0.52, 0.04, 8, 12]} rotation={[Math.PI / 2, 0, 0]} />
                        <meshStandardMaterial color="#4a4a4a" metalness={0.5} />
                    </mesh>
                ))}
            </group>

            {/* === SMALL CRATES === */}
            <mesh position={[4.8, 0.35, 2]} rotation={[0, 0.4, 0]} castShadow receiveShadow>
                <boxGeometry args={[0.7, 0.7, 0.7]} />
                <meshStandardMaterial color="#a0826d" roughness={0.8} />
            </mesh>
            <mesh position={[5.2, 0.25, 2.5]} rotation={[0, -0.2, 0]} castShadow receiveShadow>
                <boxGeometry args={[0.5, 0.5, 0.5]} />
                <meshStandardMaterial color="#9a7b6a" roughness={0.8} />
            </mesh>
        </group>
    );
});

export const StaticMap = memo(() => {
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
      
      {LEVEL_DATA.trees.map(item => (
          <RealisticTree key={item.id} position={item.position} />
      ))}
      {LEVEL_DATA.rocks.map(item => (
          <RealisticRock key={item.id} position={item.position} scale={item.scale} rotation={item.rotation} />
      ))}
      
      <FantasyHouse />
      <RiverMesh />
    </group>
  );
});
