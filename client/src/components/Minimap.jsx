import { useRef, useEffect } from 'react';
import { useStore } from '../store';
import { LEVEL_DATA } from '../levelData';
import { socket } from './SocketManager';

export const Minimap = () => {
    const canvasRef = useRef();
    const myId = socket.id;

    const MAP_SIZE = 200; // World size 200x200
    const CANVAS_SIZE = 200; // Pixel size
    const SCALE = CANVAS_SIZE / MAP_SIZE;

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        const render = () => {
            const players = useStore.getState().players;
            
            // Clear
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'; // Semi-transparent background
            ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

            // Draw Border
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.strokeRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

            // Draw Static Elements (Optimization: Could be cached in an offscreen canvas)
            // Trees
            ctx.fillStyle = '#2d5a3f'; // Dark Green
            LEVEL_DATA.trees.forEach(tree => {
                const x = (tree.position[0] + MAP_SIZE/2) * SCALE;
                const y = (tree.position[2] + MAP_SIZE/2) * SCALE;
                ctx.beginPath();
                ctx.arc(x, y, 2, 0, Math.PI * 2);
                ctx.fill();
            });

            // Rocks
            ctx.fillStyle = '#888'; // Grey
            LEVEL_DATA.rocks.forEach(rock => {
                const x = (rock.position[0] + MAP_SIZE/2) * SCALE;
                const y = (rock.position[2] + MAP_SIZE/2) * SCALE;
                ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
            });

            // Dogs (Dynamic technically, but in levelData for now)
            ctx.fillStyle = '#8B4513'; // Brown
            LEVEL_DATA.dogs.forEach(dog => {
                const x = (dog.position[0] + MAP_SIZE/2) * SCALE;
                const y = (dog.position[2] + MAP_SIZE/2) * SCALE;
                ctx.beginPath();
                ctx.arc(x, y, 1.5, 0, Math.PI * 2);
                ctx.fill();
            });

            // River
            ctx.strokeStyle = '#3366ff';
            ctx.lineWidth = 10 * SCALE; // Match visual width roughly
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            
            ctx.beginPath();
            if (LEVEL_DATA.riverPoints.length > 0) {
                const first = LEVEL_DATA.riverPoints[0];
                const x0 = (first[0] + MAP_SIZE/2) * SCALE;
                const y0 = (first[2] + MAP_SIZE/2) * SCALE;
                ctx.moveTo(x0, y0);

                for (let i = 1; i < LEVEL_DATA.riverPoints.length; i++) {
                    const p = LEVEL_DATA.riverPoints[i];
                    const x = (p[0] + MAP_SIZE/2) * SCALE;
                    const y = (p[2] + MAP_SIZE/2) * SCALE;
                    ctx.lineTo(x, y);
                }
            }
            ctx.stroke();

            // Draw Players
            Object.values(players).forEach(player => {
                const x = (player.position[0] + MAP_SIZE/2) * SCALE;
                const y = (player.position[2] + MAP_SIZE/2) * SCALE; // Z is Y in 2D
                
                // My Player
                if (player.id === myId) {
                    ctx.fillStyle = '#FFD700'; // Gold
                    ctx.beginPath();
                    ctx.arc(x, y, 4, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = '#000';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                } else {
                    // Other Players
                    ctx.fillStyle = '#FF0000'; // Red dots
                    ctx.beginPath();
                    ctx.arc(x, y, 3, 0, Math.PI * 2);
                    ctx.fill();
                }
            });

            requestAnimationFrame(render);
        };

        const animId = requestAnimationFrame(render);
        return () => cancelAnimationFrame(animId);
    }, [myId]);

    return (
        <div style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            width: '200px',
            height: '200px',
            borderRadius: '10px',
            overflow: 'hidden',
            border: '2px solid #333',
            zIndex: 100 // Ensure it's on top
        }}>
            <canvas ref={canvasRef} width={200} height={200} />
            <div style={{
                position: 'absolute',
                top: '5px',
                left: '50%',
                transform: 'translateX(-50%)',
                color: 'white',
                fontSize: '10px',
                fontWeight: 'bold',
                textShadow: '1px 1px 1px black'
            }}>N</div>
        </div>
    );
};
