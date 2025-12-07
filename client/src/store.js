import { create } from 'zustand';

export const useStore = create((set) => ({
  players: {},
  chatMessages: [],
  showGrid: false,
  isNight: true,
  setPlayers: (players) => set({ players }),
  toggleIsNight: () => set((state) => ({ isNight: !state.isNight })),
  addPlayer: (id, player) => set((state) => ({ players: { ...state.players, [id]: player } })),
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

}));
