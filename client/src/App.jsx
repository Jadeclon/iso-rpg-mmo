import { GameCanvas } from './components/GameCanvas';
import { ChatOverlay } from './components/ChatOverlay';
import { UIControls } from './components/UIControls';
import { SkinSelector } from './components/SkinSelector';
import { Minimap } from './components/Minimap';

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <GameCanvas />
      <ChatOverlay />
      <UIControls />
      <SkinSelector />
      <Minimap />
    </div>
  );
}

export default App;
