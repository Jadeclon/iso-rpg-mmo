import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrthographicCamera } from '@react-three/drei';
import { useStore } from '../store';
import { socket } from './SocketManager';
import { Vector3, MathUtils } from 'three';

export const IsometricCamera = () => {
    const cameraRef = useRef();
    const players = useStore((state) => state.players);
    const myId = socket.id;
    const { gl } = useThree();

    const rotationRef = useRef(Math.PI / 4); // Yaw (Horizontal)
    const pitchRef = useRef(Math.PI / 3);    // Pitch (Vertical, ~60 deg)
    const zoomRef = useRef(40);              // Distance from player (Radius)
    const isDragging = useRef(false);
    const prevMouseX = useRef(0);
    const prevMouseY = useRef(0);

    useEffect(() => {
        const handleMouseDown = (e) => {
            if (e.button === 2) { // Right click
                isDragging.current = true;
                prevMouseX.current = e.clientX;
                prevMouseY.current = e.clientY;
            }
        };

        const handleMouseUp = () => {
            isDragging.current = false;
        };

        const handleMouseMove = (e) => {
            if (isDragging.current) {
                const deltaX = e.clientX - prevMouseX.current;
                const deltaY = e.clientY - prevMouseY.current;
                
                // Update angles
                rotationRef.current -= deltaX * 0.005; 
                pitchRef.current = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, pitchRef.current + deltaY * 0.005));

                prevMouseX.current = e.clientX;
                prevMouseY.current = e.clientY;
            }
        };

        const handleContextMenu = (e) => {
            e.preventDefault();
            return false;
        };

        const handleWheel = (e) => {
            e.preventDefault(); // Check if this blocks page scroll, might be desired
            // Invert delta: Scroll Down (pos) -> Zoom Out (decrease)
            zoomRef.current = Math.max(10, Math.min(100, zoomRef.current - e.deltaY * 0.05));
        };

        // Use capture: true to ensure we get the events before UI elements
        window.addEventListener('mousedown', handleMouseDown, { capture: true });
        window.addEventListener('mouseup', handleMouseUp, { capture: true });
        window.addEventListener('mousemove', handleMouseMove, { capture: true });
        window.addEventListener('contextmenu', handleContextMenu, { capture: true });
        window.addEventListener('wheel', handleWheel, { passive: false }); // scale using wheel

        return () => {
            window.removeEventListener('mousedown', handleMouseDown, { capture: true });
            window.removeEventListener('mouseup', handleMouseUp, { capture: true });
            window.removeEventListener('mousemove', handleMouseMove, { capture: true });
            window.removeEventListener('contextmenu', handleContextMenu, { capture: true });
            window.removeEventListener('wheel', handleWheel);
        };
    }, []);

    // access players via getState in loop to avoid re-renders
    useFrame((state, delta) => {
        if (!cameraRef.current || !socket.id) return;
        
        const players = useStore.getState().players;
        const myId = socket.id;
        
        if (!players[myId]) return;
        
        const playerPos = players[myId].position;
        const radius = 40; // Fixed radius for physical distance
 
         // Spherical Coordinates conversion
         const horizontalRadius = radius * Math.cos(pitchRef.current);
         const yOffset = radius * Math.sin(pitchRef.current);
         
         const xOffset = horizontalRadius * Math.sin(rotationRef.current);
         const zOffset = horizontalRadius * Math.cos(rotationRef.current);
 
         const targetPos = new Vector3(
             playerPos[0] + xOffset, 
             playerPos[1] + yOffset, 
             playerPos[2] + zOffset
         );
         
         // Frame-rate independent smoothing
         // 1 - Math.exp(-decay * delta)
         const smoothing = 1 - Math.exp(-10 * delta); 
         
         const cameraFollowsPlayer = useStore.getState().cameraFollowsPlayer;
 
         if (cameraFollowsPlayer) {
             cameraRef.current.position.lerp(targetPos, smoothing);
         }
         
         // Apply Zoom
         // Lerp zoom for smoothness
         cameraRef.current.zoom = MathUtils.lerp(cameraRef.current.zoom, zoomRef.current, smoothing);
         cameraRef.current.updateProjectionMatrix();

        // Always look at player so rotation orbits them even if fixed?
        // Actually if fixed, we probably want to look at the same spot we were looking at.
        // But for "Fixed vs Follow" usually Fixed means "Don't move X/Z", but looking at player is fine.
        // Let's keep looking at player for now as it makes "Orbiting" still feel connected.
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
