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
            const { players, isNight, trader } = useStore.getState();
            // Clear / Background
            if (isNight) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.85)'; // Darker for night
            } else {
                ctx.fillStyle = '#4a8f4a'; // Bright green for day
            }
            ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

            // Draw Border
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.strokeRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

            // Static Elements
            // Trees
            ctx.fillStyle = isNight ? '#1a3324' : '#2d5a3f';
            LEVEL_DATA.trees.forEach(tree => {
                const x = (tree.position[0] + MAP_SIZE/2) * SCALE;
                const y = (tree.position[2] + MAP_SIZE/2) * SCALE;
                ctx.beginPath();
                ctx.arc(x, y, 2, 0, Math.PI * 2);
                ctx.fill();
            });

            // Rocks
            ctx.fillStyle = '#888';
            LEVEL_DATA.rocks.forEach(rock => {
                const x = (rock.position[0] + MAP_SIZE/2) * SCALE;
                const y = (rock.position[2] + MAP_SIZE/2) * SCALE;
                ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
            });

            // River
            ctx.strokeStyle = '#3366ff';
            ctx.lineWidth = 10 * SCALE;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            if (LEVEL_DATA.riverPoints.length > 0) {
                const first = LEVEL_DATA.riverPoints[0];
                ctx.moveTo((first[0] + MAP_SIZE/2) * SCALE, (first[2] + MAP_SIZE/2) * SCALE);
                for (let i = 1; i < LEVEL_DATA.riverPoints.length; i++) {
                    const p = LEVEL_DATA.riverPoints[i];
                    ctx.lineTo((p[0] + MAP_SIZE/2) * SCALE, (p[2] + MAP_SIZE/2) * SCALE);
                }
            }
            ctx.stroke();

            // Trader
            if (trader) {
                const x = (trader.position.x + MAP_SIZE/2) * SCALE;
                const y = (trader.position.z + MAP_SIZE/2) * SCALE;
                
                ctx.fillStyle = '#9932CC';
                ctx.beginPath();
                ctx.arc(x, y, 4, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.fillStyle = 'white';
                ctx.font = 'bold 8px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('T', x, y);
            }

            // Players (Last to be on top)
            Object.values(players).forEach(player => {
                const x = (player.position[0] + MAP_SIZE/2) * SCALE;
                const y = (player.position[2] + MAP_SIZE/2) * SCALE;
                
                ctx.beginPath();
                if (player.id === myId) {
                    ctx.fillStyle = '#FFD700'; // Gold
                    ctx.arc(x, y, 5, 0, Math.PI * 2); // Bigger
                } else {
                    ctx.fillStyle = '#FF0000'; // Red
                    ctx.arc(x, y, 4, 0, Math.PI * 2);
                }
                ctx.fill();
                
                // Outline
                ctx.lineWidth = 1;
                ctx.strokeStyle = 'white';
                ctx.stroke();
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
