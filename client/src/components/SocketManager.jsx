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
  const setDogs = useStore((state) => state.setDogs);
  const updateDog = useStore((state) => state.updateDog);
  const updateDogs = useStore((state) => state.updateDogs);
  const removeDog = useStore((state) => state.removeDog);
  const setItems = useStore((state) => state.setItems);
  const addItem = useStore((state) => state.addItem);
  const removeItem = useStore((state) => state.removeItem);
  const addToInventory = useStore((state) => state.addToInventory);
  const setTrader = useStore((state) => state.setTrader);

  useEffect(() => {
    function onConnect() {
      console.log("Connected to server");
      soundManager.playMusic();
    }

    function onDisconnect() {
      console.log("Disconnected from server");
    }

    function onCurrentPlayers(players) {
        setPlayers(players);
    }
    
    function onCurrentDogs(dogs) {
        setDogs(dogs);
    }

    function onCurrentItems(items) {
        setItems(items);
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

    function onDogUpdate(dog) {
        updateDog(dog);
    }

    function onDogsMoved(dogs) {
        updateDogs(dogs);
    }

    function onDogKilled(id) {
        removeDog(id);
    }
    
    function onItemDropped(item) {
        addItem(item);
    }
    
    function onItemRemoved(itemId) {
        removeItem(itemId);
    }
    
    function onInventoryAdd(item) {
        addToInventory(item);
        soundManager.playPickupSound();
    }

    function onDogBark() {
        soundManager.playBarkSound();
    }
    
    function onTraderUpdate(traderData) {
        setTrader(traderData);
    }

    function onPlayerUpdate(player) {
        useStore.getState().updatePlayer(player);
    }
    
    function onPlayerRespawn(player) {
         useStore.getState().updatePlayer(player);
         useStore.getState().updatePlayerPosition(player.id, player.position);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('currentPlayers', onCurrentPlayers);
    socket.on('currentDogs', onCurrentDogs);
    socket.on('currentItems', onCurrentItems);
    socket.on('newPlayer', onNewPlayer);
    socket.on('playerMoved', onPlayerMoved);
    socket.on('playerDisconnected', onPlayerDisconnected);
    socket.on('chatMessage', onChatMessage);
    socket.on('dogUpdate', onDogUpdate);
    socket.on('dogsMoved', onDogsMoved);
    socket.on('dogKilled', onDogKilled);
    socket.on('itemDropped', onItemDropped);
    socket.on('itemRemoved', onItemRemoved);
    socket.on('inventoryAdd', onInventoryAdd);
    socket.on('dogBark', onDogBark);
    socket.on('traderUpdate', onTraderUpdate);
    socket.on('playerUpdate', onPlayerUpdate);
    socket.on('playerRespawn', onPlayerRespawn);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('currentPlayers', onCurrentPlayers);
      socket.off('currentDogs', onCurrentDogs);
      socket.off('currentItems', onCurrentItems);
      socket.off('newPlayer', onNewPlayer);
      socket.off('playerMoved', onPlayerMoved);
      socket.off('playerDisconnected', onPlayerDisconnected);
      socket.off('chatMessage', onChatMessage);
      socket.off('dogUpdate', onDogUpdate);
      socket.off('dogsMoved', onDogsMoved);
      socket.off('dogKilled', onDogKilled);
      socket.off('itemDropped', onItemDropped);
      socket.off('itemRemoved', onItemRemoved);
      socket.off('inventoryAdd', onInventoryAdd);
      socket.off('dogBark', onDogBark);
      socket.off('traderUpdate', onTraderUpdate);
      socket.off('playerUpdate', onPlayerUpdate);
      socket.off('playerRespawn', onPlayerRespawn);
    };
  }, []);

  return null;
};
