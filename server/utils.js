
// Helper to check if in river
const getRiverX = (z) => Math.sin(z * 0.05) * 20 + Math.sin(z * 0.1) * 10;
const isPositionInRiver = (x, z) => {
    const riverX = getRiverX(z);
    return Math.abs(x - riverX) < 8.0; 
};

// House collision data (matching client levelData.js)
const HOUSE = {
    position: { x: -35, z: 25 },
    width: 7,   // X direction
    depth: 9    // Z direction
};

// Check if position collides with house
const isPositionInHouse = (x, z, mobRadius = 0.5) => {
    const halfW = HOUSE.width / 2 + mobRadius;
    const halfD = HOUSE.depth / 2 + mobRadius;
    
    return x > HOUSE.position.x - halfW && x < HOUSE.position.x + halfW &&
           z > HOUSE.position.z - halfD && z < HOUSE.position.z + halfD;
};

module.exports = {
    isPositionInRiver,
    isPositionInHouse,
    HOUSE
};
