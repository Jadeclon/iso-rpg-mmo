import { useStore } from '../store';
import { Billboard } from '@react-three/drei';
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import { useLoader } from '@react-three/fiber';
import { TextureLoader } from 'three';
import itemsDef from '../items.json';

const EmojiItem = ({ image }) => {
    const texture = useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        ctx.font = '100px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(image, 64, 64);
        const tex = new THREE.CanvasTexture(canvas);
        return tex;
    }, [image]);
    
    return (
        <mesh>
            <planeGeometry args={[0.5, 0.5]} />
            <meshBasicMaterial map={texture} transparent />
        </mesh>
    );
};

const ImageItem = ({ image }) => {
    // Note: textures/... is served from public/
    // We expect item.image to be like "textures/items/weapons/broadsword.png"
    const texture = useLoader(TextureLoader, image);
    
    return (
         <mesh>
            <planeGeometry args={[0.5, 0.5]} />
            <meshBasicMaterial map={texture} transparent />
        </mesh>
    );
}

const DroppedItem = ({ item }) => {
    const group = useRef();
    
    // Resolve image from local def if not provided in item (server refactor)
    const def = itemsDef.find(d => d.id === item.itemId);
    const image = item.image || (def ? def.image : '?');

    useFrame((state) => {
        if (group.current) {
            // Bobbing animation
            const t = state.clock.getElapsedTime();
            group.current.position.y = 0.5 + Math.sin(t * 2 + item.id.charCodeAt(item.id.length-1)) * 0.1;
            group.current.rotation.y += 0.01;
        }
    });

    const isImage = image.includes('/') || image.includes('.');

    return (
        <group ref={group} position={[item.position.x, 0.5, item.position.z]}>
            <Billboard>
                {isImage ? (
                    <ImageItem image={image} />
                ) : (
                    <EmojiItem image={image} />
                )}
            </Billboard>
        </group>
    );
};

export const ItemDrops = () => {
    const items = useStore((state) => state.items);
    
    return (
        <group>
            {Object.values(items).map(item => (
                <DroppedItem key={item.id} item={item} />
            ))}
        </group>
    );
};
