import { create } from 'zustand';

export const useStore = create((set) => ({
  players: {},
  dogs: {},
  items: {},
  inventory: [], // Added inventory array
  isInventoryOpen: false, // UI Toggle
  chatMessages: [],
  showGrid: false,
  isNight: false,
  trader: null,
  isTraderOpen: false,
  setPlayers: (players) => set({ players }),
  setDogs: (dogs) => set({ dogs }),
  updateDog: (dog) => set((state) => ({ dogs: { ...state.dogs, [dog.id]: dog } })),
  updateDogs: (dogs) => set((state) => ({ dogs: { ...state.dogs, ...dogs } })), 
  removeDog: (id) => set((state) => {
      const newDogs = { ...state.dogs };
      delete newDogs[id];
      return { dogs: newDogs };
  }),
  setItems: (items) => set({ items }),
  addItem: (item) => set((state) => ({ items: { ...state.items, [item.id]: item } })),
  removeItem: (id) => set((state) => {
    const newItems = { ...state.items };
    delete newItems[id];
    return { items: newItems };
  }),
  toggleInventory: () => set((state) => ({ isInventoryOpen: !state.isInventoryOpen })),
  addToInventory: (item) => set((state) => ({ inventory: [...state.inventory, item] })),
  removeFromInventory: (index) => set((state) => {
      const newInv = [...state.inventory];
      newInv.splice(index, 1);
      return { inventory: newInv };
  }),
  toggleIsNight: () => set((state) => ({ isNight: !state.isNight })),
  addPlayer: (id, player) => set((state) => ({ players: { ...state.players, [id]: player } })),
  updatePlayer: (player) => set((state) => {
      if (!state.players[player.id]) return {};
      // Merge updates (e.g. hp)
      return { players: { ...state.players, [player.id]: { ...state.players[player.id], ...player } } };
  }),
  updatePlayerPosition: (id, pos) => set((state) => {
      if (!state.players[id]) return {};
      return { players: { ...state.players, [id]: { ...state.players[id], position: pos } } };
  }),
  updatePlayerSkin: (id, skin) => set((state) => {
      if (!state.players[id]) return {};
      return { players: { ...state.players, [id]: { ...state.players[id], skin: skin } } };
  }),
  setPlayerAttacking: (id) => set((state) => {
      if (!state.players[id]) return {};
      return { players: { ...state.players, [id]: { ...state.players[id], lastAttack: Date.now() } } };
  }),
  addChatMessage: (msg) => set((state) => ({ chatMessages: [...state.chatMessages.slice(-19), msg] })),
  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
  removePlayer: (id) => set((state) => {
    const newPlayers = { ...state.players };
    delete newPlayers[id];
    return { players: newPlayers };
  }),
  setTrader: (trader) => set({ trader }),
  toggleTrader: () => set((state) => ({ isTraderOpen: !state.isTraderOpen })),

}));
