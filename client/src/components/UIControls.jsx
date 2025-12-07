import { useStore } from '../store';

export const UIControls = () => {
    const toggleGrid = useStore((state) => state.toggleGrid);
    const showGrid = useStore((state) => state.showGrid);
    
    return (
        <div style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
        }}>
            <button 
                onClick={toggleGrid}
                style={{
                    padding: '10px 15px',
                    background: showGrid ? '#4CAF50' : '#f44336',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                }}
            >
                Grid: {showGrid ? 'ON' : 'OFF'}
            </button>
            <button 
                onClick={useStore(state => state.toggleIsNight)}
                style={{
                    padding: '10px 15px',
                    background: useStore(state => state.isNight) ? '#333' : '#FFD700',
                    color: useStore(state => state.isNight) ? 'white' : 'black',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                }}
            >
                Time: {useStore(state => state.isNight) ? 'Night' : 'Day'}
            </button>
        </div>
    );
};
