class SoundManager {
    constructor() {
        this.ctx = null;
        this.init();
        
        // Music State
        this.musicPlaylist = [
            '/sounds/music/mystery.wav',
            '/sounds/music/summer_evening_sweden.wav'
        ];
        this.currentMusic = null;
        this.lastTrackIndex = -1;
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

    playBarkSound() {
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        // Cache the buffer
        if (!this.barkBuffer) {
            fetch('/sounds/bark.wav')
                .then(response => response.arrayBuffer())
                .then(arrayBuffer => this.ctx.decodeAudioData(arrayBuffer))
                .then(audioBuffer => {
                    this.barkBuffer = audioBuffer;
                    this.playBuffer(this.barkBuffer);
                })
                .catch(e => console.error("Error loading bark sound", e));
        } else {
            this.playBuffer(this.barkBuffer);
        }
    }

    playBuffer(buffer) {
        if (!this.ctx) return;
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(this.ctx.destination);
        source.start(0);
    }

    playMusic() {
        if (this.currentMusic) return; // Already playing

        let trackIndex;
        // Simple random playlist logic avoid repeat
        do {
            trackIndex = Math.floor(Math.random() * this.musicPlaylist.length);
        } while (this.musicPlaylist.length > 1 && trackIndex === this.lastTrackIndex);

        this.lastTrackIndex = trackIndex;
        const track = this.musicPlaylist[trackIndex];

        // Using HTML5 Audio for music streaming
        this.currentMusic = new Audio(track);
        this.currentMusic.volume = 0.2; // Background volume
        
        this.currentMusic.addEventListener('ended', () => {
            this.currentMusic = null;
            this.playMusic(); // Play next
        });
        
        this.currentMusic.play().catch(e => console.log('Music play failed (user interaction needed):', e));
    }
    
    stopMusic() {
        if (this.currentMusic) {
             this.currentMusic.pause();
             this.currentMusic = null;
        }
    }

    playStepSound(isWater) {
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        const t = this.ctx.currentTime;
        const oscillator = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();

        if (isWater) {
            // Water: Play audio file
             if (!this.waterStepBuffer) {
                fetch('/sounds/water_footstep.m4a')
                    .then(response => response.arrayBuffer())
                    .then(arrayBuffer => this.ctx.decodeAudioData(arrayBuffer))
                    .then(audioBuffer => {
                        this.waterStepBuffer = audioBuffer;
                        this.playBuffer(this.waterStepBuffer);
                    })
                    .catch(e => console.error("Error loading water step sound", e));
            } else {
                this.playBuffer(this.waterStepBuffer);
            }
        } else {
            // Ground: Play audio file
            if (!this.stepBuffer) {
                fetch('/sounds/gras_footstep.m4a')
                    .then(response => response.arrayBuffer())
                    .then(arrayBuffer => this.ctx.decodeAudioData(arrayBuffer))
                    .then(audioBuffer => {
                        this.stepBuffer = audioBuffer;
                        this.playBuffer(this.stepBuffer);
                    })
                    .catch(e => console.error("Error loading step sound", e));
            } else {
                this.playBuffer(this.stepBuffer);
            }
        }
    }
    playPickupSound() {
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const t = this.ctx.currentTime;
        const oscillator = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(1000, t);
        oscillator.frequency.exponentialRampToValueAtTime(2000, t + 0.1);

        gainNode.gain.setValueAtTime(0.1, t);
        gainNode.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

        oscillator.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        oscillator.start(t);
        oscillator.stop(t + 0.1);
    }

    playEquipSound() {
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const t = this.ctx.currentTime;

        // Metallic "Clang" - Ringing oscillators
        const fund = 800;
        const ratios = [1, 1.5, 2.7, 3.2]; // Non-integer ratios for metal
        
        ratios.forEach(ratio => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.frequency.setValueAtTime(fund * ratio, t);
            osc.type = 'triangle'; // Brighter than sine
            
            gain.gain.setValueAtTime(0.1, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5); // Long ring
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.start(t);
            osc.stop(t + 0.5);
        });

        // Initial impact (noise burst)
        const bufferSize = this.ctx.sampleRate * 0.05;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.3, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        noise.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);
        noise.start(t);
    }
    
    playTraderWelcome() {
        if (this.currentVoice) {
            this.currentVoice.pause();
            this.currentVoice = null;
        }

        const voice1 = new Audio('/sounds/voices/trader/hello_stranger.mp3');
        const voice2 = new Audio('/sounds/voices/trader/what_can_I_do.mp3');
        
        voice1.volume = 0.5;
        voice2.volume = 0.5;

        this.currentVoice = voice1;
        
        voice1.addEventListener('ended', () => {
             this.currentVoice = voice2;
             voice2.play().catch(e => console.log("Voice 2 failed", e));
        });

        voice1.play().catch(e => console.log("Voice 1 failed", e));
    }
}

export const soundManager = new SoundManager();
