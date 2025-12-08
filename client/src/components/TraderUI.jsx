import { socket } from './SocketManager';
import { useStore } from '../store';
import { soundManager } from '../SoundManager';
import { useEffect } from 'react';
import itemsDef from '../items.json';

export const TraderUI = () => {
    const isTraderOpen = useStore((state) => state.isTraderOpen);
    const toggleTrader = useStore((state) => state.toggleTrader);
    const trader = useStore((state) => state.trader);
    const players = useStore((state) => state.players);
    const inventory = useStore((state) => state.inventory);
    const removeFromInventory = useStore((state) => state.removeFromInventory);
    const shopConfig = useStore((state) => state.shopConfig);
    
    // Generate Items
    const shopItems = shopConfig.map(entry => {
        const def = itemsDef.find(i => i.id === entry.id);
        return {
            id: entry.id,
            name: def ? def.name : entry.id,
            price: entry.price,
            icon: def ? def.image : '?'
        };
    });
    
    // Auto-Close Logic
    useEffect(() => {
        if (!isTraderOpen || !trader) return;
        
        const checkDistance = setInterval(() => {
             const player = players[socket.id];
             if (player && trader) {
                 const dx = player.position[0] - trader.position.x;
                 const dz = player.position[2] - trader.position.z;
                 const dist = Math.sqrt(dx*dx + dz*dz);
                 if (dist > 3) { // Threshold
                     toggleTrader();
                 }
             }
        }, 500);
        
        return () => clearInterval(checkDistance);
    }, [isTraderOpen, trader, players, toggleTrader]);

    const handleBuy = (item) => {
        const goldItem = inventory.find(i => i.itemId === 'gold');
        const goldCount = goldItem ? goldItem.count : 0;
        
        if (goldCount >= item.price) {
            // Deduct Gold Locally (Optimistic)
            for(let i=0; i<item.price; i++) {
                removeFromInventory('gold');
            }
            
            // Emit Trade
            socket.emit('trade', { itemId: item.id });
            soundManager.playTradeSuccess();
        } else {
            // alert("Not enough Gold! Go kill some dogs.");
            soundManager.playTradeFail();
        }
    };

    if (!isTraderOpen || !trader) return null;

    return (
        <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '500px',
            height: '400px',
            background: 'rgba(20, 20, 20, 0.95)',
            border: '4px solid #FFD700',
            borderRadius: '15px',
            padding: '20px',
            color: '#FFD700',
            display: 'flex',
            flexDirection: 'column',
            gap: '15px',
            zIndex: 1001,
            fontFamily: 'monospace'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #FFD700', paddingBottom: '10px' }}>
                <h2 style={{ margin: 0 }}>🧙‍♂️ Wandering Trader</h2>
                <div style={{ fontSize: '12px' }}>Press 'T' to close</div>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {shopItems.map((item) => (
                    <div key={item.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        marginBottom: '5px',
                        borderRadius: '5px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '24px', display: 'flex', alignItems: 'center' }}>
                                {(item.image?.includes('/') || item.image?.includes('.')) ? (
                                    <img src={item.image} alt={item.name} style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
                                ) : (
                                    item.icon
                                )}
                            </span>
                            <div>
                                <div style={{ fontWeight: 'bold' }}>{item.name}</div>
                                <div style={{ fontSize: '12px', color: '#aaa' }}>{item.desc || 'A mysterious item.'}</div>
                            </div>
                        </div>
                        <button style={{
                            background: '#FFD700',
                            color: 'black',
                            border: 'none',
                            padding: '8px 15px',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                        }} onClick={() => handleBuy(item)}>
                            {item.price} 💰
                        </button>
                    </div>
                ))}
            </div>
            
             <div style={{ textAlign: 'center', color: '#888', fontSize: '12px' }}>
                "No refunds, no returns, no warranties!"
            </div>
        </div>
    );
};
