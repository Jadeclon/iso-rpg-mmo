import { GameCanvas } from './components/GameCanvas';
import { ChatOverlay } from './components/ChatOverlay';
import { socket } from './components/SocketManager';
import { UIControls } from './components/UIControls';
import { SkinSelector } from './components/SkinSelector';
import { Minimap } from './components/Minimap';
import { Inventory } from './components/Inventory';
import { TraderUI } from './components/TraderUI';
import { useStore } from './store';
import { useEffect } from 'react';
import { soundManager } from './SoundManager';

function App() {
  const toggleInventory = useStore((state) => state.toggleInventory);
  const toggleTrader = useStore((state) => state.toggleTrader);

  useEffect(() => {
    const handleKeyDown = (e) => {
        // Ignore if typing in chat
        if (document.activeElement.tagName === 'INPUT') return;

        if (e.code === 'KeyI' || e.code === 'KeyE') {
            toggleInventory();
        }

        if (e.code === 'KeyT') {
             const state = useStore.getState();
             const myId = socket.id;
             const me = state.players[myId];
             const trader = state.trader;
             
             if (me && trader) {
                 const dx = me.position[0] - trader.position.x;
                 const dz = me.position[2] - trader.position.z;
                 const dist = Math.sqrt(dx*dx + dz*dz);
                 
                 if (dist < 4.0) {
                     if (!state.isTraderOpen) {
                         // Only play if OPENING the shop
                         soundManager.playTraderWelcome();
                     }
                     toggleTrader();
                 }
             }
        }
        
        if (e.code === 'KeyY' || e.key.toLowerCase() === 'y') {
             const state = useStore.getState();
             const myId = socket.id;
             const me = state.players[myId];
             const items = state.items;

             if (me) {
                 // specific pickup logic
                 for (const itemId in items) {
                     const item = items[itemId];
                     const dx = me.position[0] - item.position.x;
                     const dz = me.position[2] - item.position.z;
                     const dist = Math.sqrt(dx*dx + dz*dz);
                     
                     if (dist < 2.0) {
                         socket.emit('pickupItem', itemId);
                         break; // Pick up one at a time
                     }
                 }
             }
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleInventory]);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <GameCanvas />
      <ChatOverlay />
      <UIControls />
      <SkinSelector />
      <Inventory />
      <TraderUI />
      <Minimap />
    </div>
  );
}

export default App;
