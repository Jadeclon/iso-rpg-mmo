import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { socket } from './SocketManager';

export const ChatOverlay = () => {
  const chatMessages = useStore((state) => state.chatMessages);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim()) {
        socket.emit('chatMessage', inputValue.trim());
        setInputValue("");
    }
  };

  const handleKeyDown = (e) => {
      e.stopPropagation(); // Stop event from reaching 3D controls
  };

  return (
    <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        width: '300px',
        height: '200px',
        display: 'flex',
        flexDirection: 'column',
        pointerEvents: 'none' // Let clicks pass through container
    }}>
      <div style={{
          flex: 1,
          overflowY: 'auto',
          marginBottom: '10px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          textShadow: '1px 1px 2px black',
          color: 'white',
          fontFamily: 'sans-serif',
          fontSize: '14px',
          pointerEvents: 'auto'
      }}>
        {chatMessages.map((msg, index) => (
            <div key={index} style={{ marginBottom: '4px' }}>
                <span style={{ fontWeight: 'bold', color: msg.color }}>{msg.sender}: </span>
                <span>{msg.text}</span>
            </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} style={{ pointerEvents: 'auto' }}>
        <input 
            ref={inputRef}
            type="text" 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Press Enter to chat..."
            style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid rgba(255,255,255,0.3)',
                background: 'rgba(0,0,0,0.5)',
                color: 'white'
            }}
        />
      </form>
    </div>
  );
};
