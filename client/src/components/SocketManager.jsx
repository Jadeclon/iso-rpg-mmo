import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useStore } from '../store';
import { soundManager } from '../SoundManager';

const URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3002';

export const socket = io(URL);

export const SocketManager = () => {
  const setPlayers = useStore((state) => state.setPlayers);
  const addPlayer = useStore((state) => state.addPlayer);
  const removePlayer = useStore((state) => state.removePlayer);
  const updatePlayerPosition = useStore((state) => state.updatePlayerPosition);

  useEffect(() => {
    function onConnect() {
      console.log("Connected to server");
    }

    function onDisconnect() {
      console.log("Disconnected from server");
    }

    function onCurrentPlayers(players) {
      setPlayers(players);
    }

    function onNewPlayer(player) {
      addPlayer(player.id, player);
      soundManager.playJoinSound();
    }

    function onPlayerMoved({ id, position }) {
        if (id === socket.id) return;
        updatePlayerPosition(id, position);
    }

    function onPlayerDisconnected(id) {
      removePlayer(id);
    }
    
    function onChatMessage(message) {
        useStore.getState().addChatMessage(message);
        soundManager.playChatSound();
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('currentPlayers', onCurrentPlayers);
    socket.on('newPlayer', onNewPlayer);
    socket.on('playerMoved', onPlayerMoved);
    socket.on('playerDisconnected', onPlayerDisconnected);
    socket.on('chatMessage', onChatMessage);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('currentPlayers', onCurrentPlayers);
      socket.off('newPlayer', onNewPlayer);
      socket.off('playerMoved', onPlayerMoved);
      socket.off('playerDisconnected', onPlayerDisconnected);
      socket.off('chatMessage', onChatMessage);
    };
  }, []);

  return null;
};
