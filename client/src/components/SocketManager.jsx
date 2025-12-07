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
  const setBears = useStore((state) => state.setBears);
  const updateBear = useStore((state) => state.updateBear);
  const updateBears = useStore((state) => state.updateBears);
  const removeBear = useStore((state) => state.removeBear);
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

    function onCurrentBears(bears) {
        setBears(bears);
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

    function onBearUpdate(bear) {
        updateBear(bear);
    }

    function onBearsMoved(bears) {
        updateBears(bears);
    }

    function onBearKilled(id) {
        removeBear(id);
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

    function onBearBark() {
        // soundManager.playBearRoar(); // TODO: Add roar sound
        soundManager.playBarkSound(); // Fallback
    }
    
    function onDogDamage(dogId) {
        // Find dog and check distance
        const dogs = useStore.getState().dogs;
        const dog = dogs[dogId];
        const playerId = socket.id;
        const player = useStore.getState().players[playerId]; // Need to access from store or socket?
        
        // Wait, socket.id is available. Store players has current player?
        // Let's trust store.
        if (dog && player) {
             const dx = dog.position.x - player.position[0];
             const dz = dog.position.z - player.position[2];
             const dist = Math.sqrt(dx*dx + dz*dz);
             if (dist < 15) { // Nearby
                  soundManager.playDogYelp();
             }
        } else if (dog) {
            // Fallback if player not found (race condition), just play if we know dog exists
             soundManager.playDogYelp();
        }
    }

    function onBearDamage(bearId) {
         soundManager.playDogYelp(); // Fallback
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
    socket.on('currentBears', onCurrentBears);
    socket.on('currentItems', onCurrentItems);
    socket.on('newPlayer', onNewPlayer);
    socket.on('playerMoved', onPlayerMoved);
    socket.on('playerDisconnected', onPlayerDisconnected);
    socket.on('chatMessage', onChatMessage);
    socket.on('dogUpdate', onDogUpdate);
    socket.on('dogsMoved', onDogsMoved);
    socket.on('dogKilled', onDogKilled);
    socket.on('bearUpdate', onBearUpdate);
    socket.on('bearsMoved', onBearsMoved);
    socket.on('bearKilled', onBearKilled);
    socket.on('itemDropped', onItemDropped);
    socket.on('itemRemoved', onItemRemoved);
    socket.on('inventoryAdd', onInventoryAdd);
    socket.on('dogBark', onDogBark);
    socket.on('dogDamage', onDogDamage);
    socket.on('bearBark', onBearBark);
    socket.on('bearDamage', onBearDamage);
    socket.on('traderUpdate', onTraderUpdate);
    socket.on('playerUpdate', onPlayerUpdate);
    socket.on('playerRespawn', onPlayerRespawn);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('currentPlayers', onCurrentPlayers);
      socket.off('currentDogs', onCurrentDogs);
      socket.off('currentBears', onCurrentBears);
      socket.off('currentItems', onCurrentItems);
      socket.off('newPlayer', onNewPlayer);
      socket.off('playerMoved', onPlayerMoved);
      socket.off('playerDisconnected', onPlayerDisconnected);
      socket.off('chatMessage', onChatMessage);
      socket.off('dogUpdate', onDogUpdate);
      socket.off('dogsMoved', onDogsMoved);
      socket.off('dogKilled', onDogKilled);
      socket.off('bearUpdate', onBearUpdate);
      socket.off('bearsMoved', onBearsMoved);
      socket.off('bearKilled', onBearKilled);
      socket.off('itemDropped', onItemDropped);
      socket.off('itemRemoved', onItemRemoved);
      socket.off('inventoryAdd', onInventoryAdd);
      socket.off('dogBark', onDogBark);
      socket.off('dogDamage', onDogDamage);
      socket.off('bearBark', onBearBark);
      socket.off('bearDamage', onBearDamage);
      socket.off('traderUpdate', onTraderUpdate);
      socket.off('playerUpdate', onPlayerUpdate);
      socket.off('playerRespawn', onPlayerRespawn);
    };
  }, []);

  return null;
};
