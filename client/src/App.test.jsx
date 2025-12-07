// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeAll, vi } from 'vitest';
import App from './App';
import React from 'react';
import * as matchers from '@testing-library/jest-dom/matchers';

expect.extend(matchers);

// Import Player to ensure it compiles (catches syntax errors/bad imports)
// If this fails, the test suite crashes, which is what we want for this regression.
import * as PlayerModule from './components/Player';

vi.mock('./SoundManager', () => ({
    soundManager: {
        playAttackSound: vi.fn(),
    }
}));

// Mock Experience to avoid WebGL/R3F complexity in jsdom
vi.mock('./components/Experience', () => ({
    Experience: () => <div data-testid="experience-mock">Experience 3D World</div>
}));

vi.mock('socket.io-client', () => ({
    io: () => ({
        on: vi.fn(),
        off: vi.fn(),
        emit: vi.fn(),
        id: 'test-socket-id'
    })
}));



// Mock Browser APIs not in jsdom
beforeAll(() => {
    window.AudioContext = class {
        createGain() { return { connect: () => {}, gain: { setValueAtTime: () => {}, linearRampToValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} } }; }
        createOscillator() { return { connect: () => {}, start: () => {}, stop: () => {}, frequency: { setValueAtTime: () => {} }, type: '' }; }
        destination = {};
    };
    window.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
    };
    HTMLCanvasElement.prototype.getContext = () => { 
        return {
            scale: () => {},
            clearRect: () => {},
            strokeRect: () => {},
            fillRect: () => {},
            save: () => {},
            restore: () => {},
            translate: () => {},
            moveTo: () => {},
            lineTo: () => {},
            beginPath: () => {},
            stroke: () => {},
            fill: () => {},
            arc: () => {},
        };
    };
    HTMLCanvasElement.prototype.getBoundingClientRect = () => ({ width: 800, height: 600, top: 0, left: 0 });
    
    window.matchMedia = window.matchMedia || function() {
        return {
            matches: false,
            addListener: function() {},
            removeListener: function() {}
        };
    };
    
    window.PointerEvent = class PointerEvent extends Event {};
});

describe('Black Screen Regression Check', () => {
  it('renders the game canvas and UI without crashing', async () => {
    // Populate store so SkinSelector renders
    const { useStore } = await import('./store');
    useStore.setState({
        players: {
            'test-socket-id': {
                id: 'test-socket-id',
                position: [0, 0, 0],
                color: '#ffffff',
                skin: 'adventurer'
            }
        }
    });

    render(<App />);
    
    // Check for UI elements that should always be present
    expect(screen.getByText(/Adventurer/i)).toBeInTheDocument();
    expect(screen.getByText(/Warrior/i)).toBeInTheDocument();
    
    // Check for Canvas (Three.js usually creates a canvas element)
    const canvas = document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
    
    // Ensure no white/black screen by checking for key overlay elements
    await waitFor(() => {
        expect(screen.getByPlaceholderText(/Press Enter to chat/i)).toBeInTheDocument();
    });
  });
});
