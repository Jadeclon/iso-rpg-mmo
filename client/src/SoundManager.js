class SoundManager {
    constructor() {
        this.ctx = null;
        this.init();
    }

    init() {
        try {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        } catch (e) {
            console.warn('Web Audio API not supported');
        }
    }

    playAttackSound() {
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        const t = this.ctx.currentTime;
        const oscillator = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        // White noise buffer for "swoosh" texture
        const bufferSize = this.ctx.sampleRate * 0.5; // 0.5 seconds
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        // Filter Setup for Swoosh
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(200, t);
        filter.frequency.exponentialRampToValueAtTime(3000, t + 0.1); // Sweep up
        filter.frequency.exponentialRampToValueAtTime(100, t + 0.3); // Sweep down

        // Gain Envelope
        gainNode.gain.setValueAtTime(0, t);
        gainNode.gain.linearRampToValueAtTime(0.5, t + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

        // Connections
        noise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        // Play
        noise.start(t);
        noise.stop(t + 0.3);
    }

    playChatSound() {
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        const t = this.ctx.currentTime;
        const oscillator = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, t);
        oscillator.frequency.exponentialRampToValueAtTime(400, t + 0.1);

        gainNode.gain.setValueAtTime(0.3, t);
        gainNode.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

        oscillator.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        oscillator.start(t);
        oscillator.stop(t + 0.1);
    }

    playJoinSound() {
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        const t = this.ctx.currentTime;
        const oscillator = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();

        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(300, t);
        oscillator.frequency.linearRampToValueAtTime(600, t + 0.2);

        gainNode.gain.setValueAtTime(0, t);
        gainNode.gain.linearRampToValueAtTime(0.3, t + 0.1);
        gainNode.gain.linearRampToValueAtTime(0, t + 0.2);

        oscillator.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        oscillator.start(t);
        oscillator.stop(t + 0.2);
    }
}

export const soundManager = new SoundManager();
