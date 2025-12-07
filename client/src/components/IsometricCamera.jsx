import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrthographicCamera } from '@react-three/drei';
import { useStore } from '../store';
import { socket } from './SocketManager';
import { Vector3 } from 'three';

export const IsometricCamera = () => {
    const cameraRef = useRef();
    const players = useStore((state) => state.players);
    const myId = socket.id;
    const { gl } = useThree();

    const rotationRef = useRef(Math.PI / 4); // Default 45 degrees
    const isDragging = useRef(false);
    const prevMouseX = useRef(0);

    useEffect(() => {
        const handleMouseDown = (e) => {
            if (e.button === 2) { // Right click
                isDragging.current = true;
                prevMouseX.current = e.clientX;
            }
        };

        const handleMouseUp = () => {
            isDragging.current = false;
        };

        const handleMouseMove = (e) => {
            if (isDragging.current) {
                const deltaX = e.clientX - prevMouseX.current;
                rotationRef.current -= deltaX * 0.005; 
                prevMouseX.current = e.clientX;
            }
        };

        const handleContextMenu = (e) => {
            e.preventDefault();
            return false;
        };

        // Use capture: true to ensure we get the events before UI elements
        window.addEventListener('mousedown', handleMouseDown, { capture: true });
        window.addEventListener('mouseup', handleMouseUp, { capture: true });
        window.addEventListener('mousemove', handleMouseMove, { capture: true });
        window.addEventListener('contextmenu', handleContextMenu, { capture: true });

        return () => {
            window.removeEventListener('mousedown', handleMouseDown, { capture: true });
            window.removeEventListener('mouseup', handleMouseUp, { capture: true });
            window.removeEventListener('mousemove', handleMouseMove, { capture: true });
            window.removeEventListener('contextmenu', handleContextMenu, { capture: true });
        };
    }, []);

    // access players via getState in loop to avoid re-renders
    useFrame((state, delta) => {
        if (!cameraRef.current || !socket.id) return;
        
        const players = useStore.getState().players;
        const myId = socket.id;
        
        if (!players[myId]) return;
        
        const playerPos = players[myId].position;
        const radius = 28;
        const xOffset = Math.sin(rotationRef.current) * radius;
        const zOffset = Math.cos(rotationRef.current) * radius;

        const targetPos = new Vector3(
            playerPos[0] + xOffset, 
            playerPos[1] + 20, 
            playerPos[2] + zOffset
        );
        
        // Frame-rate independent smoothing
        // 1 - Math.exp(-decay * delta)
        // Adjust decay: 5 is slow/smooth, 15 is snappy. Let's try 10.
        const smoothing = 1 - Math.exp(-10 * delta); 
        
        cameraRef.current.position.lerp(targetPos, smoothing);
        cameraRef.current.lookAt(playerPos[0], playerPos[1], playerPos[2]);
    });

  return (
    <OrthographicCamera
      ref={cameraRef}
      makeDefault
      position={[20, 20, 20]}
      zoom={40}
      near={-100}
      far={200}
    />
  );
};
