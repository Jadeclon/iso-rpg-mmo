import { useStore } from '../store';
import itemsDef from '../items.json';

export const TraderUI = () => {
    const isTraderOpen = useStore((state) => state.isTraderOpen);
    const trader = useStore((state) => state.trader);
    
    // Default shop items (hardcoded for now as server just sends strings)
    // Ideally server sends full item definitions or IDs that map to itemsDef
    const shopItems = [
        { id: 'health_potion', name: 'Health Potion', price: 50, icon: '🧪' },
        { id: 'sword_iron', name: 'Iron Sword', price: 100, icon: '🗡️' },
        { id: 'shield_wood', name: 'Wood Shield', price: 75, icon: '🛡️' }
    ];

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
                            <span style={{ fontSize: '24px' }}>{item.icon}</span>
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
                        }} onClick={() => alert("Trading logic coming soon!")}>
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
