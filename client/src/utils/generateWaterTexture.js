export const generateWaterTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Base Blue
    ctx.fillStyle = '#3366ff';
    ctx.fillRect(0, 0, 512, 512);

    // Simple Noise / Ripples
    for (let i = 0; i < 500; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const radius = Math.random() * 20 + 5;
        const opacity = Math.random() * 0.2;

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.fill();
    }
    
    // Streaks for flow
    for (let i = 0; i < 100; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const w = Math.random() * 50 + 20;
        const h = Math.random() * 5 + 2;
        
        ctx.fillStyle = `rgba(255, 255, 255, 0.1)`;
        ctx.fillRect(x, y, w, h);
    }

    return canvas;
};
