import { useStore } from '../store';
import itemsDef from '../items.json';
import { useState, useRef, useEffect } from 'react';

import { socket } from './SocketManager';

export const Inventory = () => {
    const isInventoryOpen = useStore((state) => state.isInventoryOpen);
    const inventory = useStore((state) => state.inventory);
    const removeFromInventory = useStore((state) => state.removeFromInventory);
    
    // Default position: Right-Center
    const [position, setPosition] = useState({ x: window.innerWidth - 450, y: window.innerHeight / 2 - 150 });
    const [isDragging, setIsDragging] = useState(false);
    const dragOffset = useRef({ x: 0, y: 0 });

    // Context Menu State
    const [contextMenu, setContextMenu] = useState(null); // { x, y, item }

    const handleMouseDown = (e) => {
        if (e.target.closest('.inventory-item')) return; // Don't drag if clicking item
        setIsDragging(true);
        dragOffset.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y
        };
        setContextMenu(null); // Close menu on drag
    };

    const handleItemRightClick = (e, item) => {
        e.preventDefault();
        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            item: item
        });
    };

    const handleAction = (action) => {
        if (!contextMenu) return;
        const width = 400; // inventory width
        const item = contextMenu.item;
        
        if (action === 'use') {
            if (item.itemId === 'health_potion') {
                socket.emit('useItem', item.itemId);
                removeFromInventory(item.itemId); // Reduce count
            }
        } else if (action === 'throw') {
             removeFromInventory(item.itemId); // Local remove
             socket.emit('dropItem', item.itemId); // Sync with server
        }
        setContextMenu(null);
    };

    // Close context menu on click elsewhere
    useEffect(() => {
        const handleClick = () => setContextMenu(null);
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, []);

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
        <>
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
            }} onMouseDown={handleMouseDown}>
                <h2 
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
                            <div key={index} 
                                className="inventory-item"
                                onContextMenu={(e) => handleItemRightClick(e, item)}
                                style={{
                                width: '60px',
                                height: '60px',
                                background: 'rgba(255, 255, 255, 0.1)',
                                border: '1px solid #555',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                fontSize: '30px',
                                cursor: 'help', // Context menu hint
                                position: 'relative'
                            }} title={def ? def.name : 'Unknown'}>
                                {def ? def.image : '?'}
                                {item.count > 1 && (
                                    <div style={{
                                        position: 'absolute',
                                        bottom: '2px',
                                        right: '2px',
                                        fontSize: '12px',
                                        background: 'rgba(0,0,0,0.7)',
                                        padding: '1px 4px',
                                        borderRadius: '3px'
                                    }}>
                                        {item.count}
                                    </div>
                                )}
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
                    Right-click items for actions.
                </div>
            </div>
            
            {/* Context Menu */}
            {contextMenu && (
                <div style={{
                    position: 'absolute',
                    top: contextMenu.y,
                    left: contextMenu.x,
                    background: '#333',
                    border: '1px solid #888',
                    borderRadius: '5px',
                    zIndex: 2000,
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '5px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.5)'
                }}>
                    {contextMenu.item.itemId === 'health_potion' && (
                         <div 
                            onClick={() => handleAction('use')}
                            style={{ padding: '8px 12px', cursor: 'pointer', color: 'lime', borderBottom: '1px solid #444' }}
                         >
                            Use
                         </div>
                    )}
                    <div 
                        onClick={() => handleAction('throw')}
                        style={{ padding: '8px 12px', cursor: 'pointer', color: 'red' }}
                    >
                        Throw Away
                    </div>
                </div>
            )}
        </>
    );
};

function max(a, b) { return a > b ? a : b; }
