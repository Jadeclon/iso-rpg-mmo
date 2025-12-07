import { useStore } from '../store';
import { socket } from './SocketManager';
import { soundManager } from '../SoundManager';

export const SkinSelector = () => {
    const myId = socket.id;
    // We can't easily get *my* skin from the store without knowing myId, 
    // but the store is a map of ID -> Player.
    const players = useStore((state) => state.players);
    const myPlayer = players[myId];
    
    if (!myPlayer) return null;

    const skins = [
        { id: 'adventurer', name: 'Adventurer', color: '#4CAF50' },
        { id: 'warrior', name: 'Warrior', color: '#2196F3' }
    ];

    const setSkin = (skinId) => {
        socket.emit('skinUpdate', skinId);
        // Optimistic update
        useStore.getState().updatePlayerSkin(myId, skinId);
        
        if (skinId === 'warrior') {
            soundManager.playEquipSound();
        }
    };

    return (
        <div style={{
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '10px',
            background: 'rgba(0,0,0,0.5)',
            padding: '10px',
            borderRadius: '10px'
        }}>
            {skins.map(skin => (
                <button
                    key={skin.id}
                    onClick={() => setSkin(skin.id)}
                    style={{
                        padding: '10px 20px',
                        background: myPlayer.skin === skin.id ? skin.color : '#555',
                        color: 'white',
                        border: '2px solid white',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        opacity: myPlayer.skin === skin.id ? 1 : 0.7
                    }}
                >
                    {skin.name}
                </button>
            ))}
        </div>
    );
};
