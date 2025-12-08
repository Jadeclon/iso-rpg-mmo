module.exports = {
    dog: [
        { itemId: 'bone', rate: 0.5 },
        { itemId: 'meat', rate: 0.2 },
        { itemId: 'health_potion', rate: 0.05 },
        { itemId: 'gold', rate: 0.3, min: 0, max: 1 },
    ],
    bear: [
        { itemId: 'meat', rate: 0.8 },
        { itemId: 'gold', rate: 0.3, min: 2, max: 5 },
        { itemId: 'health_potion', rate: 0.6 },
        { itemId: 'shield_wood', rate: 0.05 }
    ]
};
