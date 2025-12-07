import { useStore } from '../store';
import itemsDef from '../items.json';
import { useState, useRef, useEffect } from 'react';

export const Inventory = () => {
    const isInventoryOpen = useStore((state) => state.isInventoryOpen);
    const inventory = useStore((state) => state.inventory);
    
    // Default position: Right-Center
    const [position, setPosition] = useState({ x: window.innerWidth - 450, y: window.innerHeight / 2 - 150 });
    const [isDragging, setIsDragging] = useState(false);
    const dragOffset = useRef({ x: 0, y: 0 });

    const handleMouseDown = (e) => {
        setIsDragging(true);
        dragOffset.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y
        };
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (isDragging) {
                setPosition({
                    x: e.clientX - dragOffset.current.x,
                    y: e.clientY - dragOffset.current.y
                });
            }
        };
        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);
    
    if (!isInventoryOpen) return null;

    return (
        <div style={{
            position: 'absolute',
            left: `${position.x}px`,
            top: `${position.y}px`,
            width: '400px',
            height: '300px',
            background: 'rgba(0, 0, 0, 0.8)',
            border: '2px solid #8B4513',
            borderRadius: '10px',
            padding: '20px',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            zIndex: 1000,
            userSelect: 'none'
        }}>
            <h2 
                onMouseDown={handleMouseDown}
                style={{ 
                    margin: 0, 
                    textAlign: 'center', 
                    borderBottom: '1px solid #555', 
                    paddingBottom: '10px',
                    cursor: 'grab',
                    background: '#3e2723',
                    borderRadius: '5px'
                }}
            >
                Inventory
            </h2>
            
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(5, 1fr)', 
                gap: '10px',
                overflowY: 'auto'
            }}>
                {/* Render existing items */}
                {inventory.map((item, index) => {
                    const def = itemsDef.find(d => d.id === item.itemId);
                    return (
                        <div key={index} style={{
                            width: '60px',
                            height: '60px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid #555',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            fontSize: '30px',
                            cursor: 'pointer'
                        }} title={def ? def.name : 'Unknown'}>
                            {def ? def.image : '?'}
                        </div>
                    );
                })}
                
                {/* Fill remaining slots to make it look like a grid */}
                {[...Array(max(0, 20 - inventory.length))].map((_, i) => (
                    <div key={`empty-${i}`} style={{
                        width: '60px',
                        height: '60px',
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid #333'
                    }} />
                ))}
            </div>
            
             <div style={{ marginTop: 'auto', fontSize: '12px', color: '#aaa', textAlign: 'center' }}>
                Press 'I' or 'E' to close. Drag header to move.
            </div>
        </div>
    );
};

function max(a, b) { return a > b ? a : b; }
