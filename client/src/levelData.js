export const LEVEL_DATA = {
  trees: [],
  rocks: [],
  dogs: [],
  riverPoints: []
};

// Generate deterministic random data (simple seeded-like approach)
// For now, just a fixed loop is fine since this runs once on load
// In a real app, this might come from the server or a JSON file

// Generate deterministic random data (simple seeded-like approach)
for (let i = 0; i < 100; i++) {
    // Deterministic pseudo-random positions using sine/cosine
    const x = (Math.sin(i * 123.45) * 90); 
    const z = (Math.cos(i * 678.90) * 90);
    
    // Avoid spawn area (0,0) with radius 5
    if (Math.sqrt(x*x + z*z) > 5) {
        LEVEL_DATA.trees.push({
            id: `tree-${i}`,
            position: [x, 0, z],
            radius: 0.5 // Collision radius
        });
    }
}

for (let i = 0; i < 50; i++) {
    const x = (Math.cos(i * 321.45) * 90);
    const z = (Math.sin(i * 987.65) * 90);

    if (Math.sqrt(x*x + z*z) > 5) {
        LEVEL_DATA.rocks.push({
            id: `rock-${i}`,
            position: [
                x,
                0.3,
                z
            ],
            scale: 0.5 + (Math.abs(Math.sin(i)) * 0.8),
            rotation: [Math.abs(Math.cos(i)), Math.abs(Math.sin(i)), 0],
            radius: 0.8 // Collision radius
        });
    }
}

for (let i = 0; i < 10; i++) {
    const x = (Math.sin(i * 555.55) * 40); 
    const z = (Math.cos(i * 444.44) * 40);
    // Avoid center spawn area a bit
    if (Math.sqrt(x*x + z*z) > 8) {
        LEVEL_DATA.dogs.push({
            id: `dog-${i}`,
            position: [x, 0, z],
            rotation: [0, Math.random() * Math.PI * 2, 0]
        });
    }
}

// River Generation
// Flowing from Z -100 to 100
// Generate points for TubeGeometry path
const points = [];
for (let z = -100; z <= 100; z += 5) { 
    const x = Math.sin(z * 0.05) * 20 + Math.sin(z * 0.1) * 10;
    points.push([x, 0, z]);
}
LEVEL_DATA.riverPoints = points;

// Helper for river path
const getRiverX = (z) => Math.sin(z * 0.05) * 20 + Math.sin(z * 0.1) * 10;

// Filter trees/rocks/dogs that are in the river
const isPositionInRiver = (x, z) => {
    const riverX = getRiverX(z);
    return Math.abs(x - riverX) < 8.0; // Exclusion radius
};

// Filter existing arrays
LEVEL_DATA.trees = LEVEL_DATA.trees.filter(t => !isPositionInRiver(t.position[0], t.position[2]));
LEVEL_DATA.rocks = LEVEL_DATA.rocks.filter(r => !isPositionInRiver(r.position[0], r.position[2]));
LEVEL_DATA.dogs = LEVEL_DATA.dogs.filter(d => !isPositionInRiver(d.position[0], d.position[2]));
