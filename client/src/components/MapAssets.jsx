import { useMemo, memo } from 'react';
import { socket } from './SocketManager';
import { Dog } from './Mobs/Dog';
import { Bear } from './Mobs/Bear';
import { Campfire } from './Campfire';
import { StaticMap } from './StaticMap';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../store';

const ConnectedDog = memo(({ id }) => {
    // Custom equality function: compare JSON string of the object
    // This handles the server sending fresh object references for identical data
    const dog = useStore((state) => state.dogs[id], (a, b) => JSON.stringify(a) === JSON.stringify(b));

    if (!dog) return null;

    return (
        <Dog 
            key={dog.id} 
            id={dog.id}
            position={[dog.position.x, dog.position.y, dog.position.z]} 
            rotation={dog.rotation} 
            hp={dog.hp}
            maxHp={dog.maxHp}
            state={dog.state}
            wanderTarget={dog.wanderTarget}
        />
    );
});

const ConnectedBear = memo(({ id }) => {
    const bear = useStore((state) => state.bears[id], (a, b) => JSON.stringify(a) === JSON.stringify(b));

    if (!bear) return null;

    return (
        <Bear 
            key={bear.id} 
            id={bear.id}
            position={[bear.position.x, bear.position.y, bear.position.z]} 
            rotation={bear.rotation} 
            hp={bear.hp}
            maxHp={bear.maxHp}
            state={bear.state}
            jumpState={bear.jumpState}
            targetId={bear.target}
            wanderTarget={bear.wanderTarget}
        />
    );
});

const ConnectedCampfire = memo(({ id }) => {
    const fire = useStore((state) => state.campfires[id]); // Static, no updates usually
    
    if (!fire) return null;

    return (
        <Campfire position={[fire.position.x, fire.position.y, fire.position.z]} />
    );
});

export const MapAssets = memo(() => {
  const showGrid = useStore((state) => state.showGrid);
  
  // Select only IDs, stable with useShallow
  const allDogIds = useStore(useShallow((state) => Object.keys(state.dogs)));
  const allBearIds = useStore(useShallow((state) => Object.keys(state.bears)));
  const campfireIds = useStore(useShallow((state) => Object.keys(state.campfires)));
  
  const myPlayer = useStore((state) => state.players[socket.id]);

  const visibleDogIds = useMemo(() => {
      if (!myPlayer) return allDogIds;
      const dogs = useStore.getState().dogs;
      return allDogIds.filter(id => {
          const dog = dogs[id];
          if (!dog) return false;
          const dx = dog.position.x - myPlayer.position[0];
          const dz = dog.position.z - myPlayer.position[2];
          return (dx*dx + dz*dz) < 1225; // 35 * 35
      });
  }, [allDogIds, myPlayer]); 

  const visibleBearIds = useMemo(() => {
      if (!myPlayer) return allBearIds;
      const bears = useStore.getState().bears;
      return allBearIds.filter(id => {
          const bear = bears[id];
          if (!bear) return false;
          const dx = bear.position.x - myPlayer.position[0];
          const dz = bear.position.z - myPlayer.position[2];
          return (dx*dx + dz*dz) < 1225; // 35 * 35
      });
  }, [allBearIds, myPlayer]);

  return (
    <group>
      <StaticMap />
      
      {/* Grid Helper */}
      {showGrid && <gridHelper args={[200, 200, '#3a6b02', '#4c8a03']} position={[0, -0.09, 0]} opacity={0.3} transparent />}

      {visibleDogIds.map(id => (
          <ConnectedDog key={id} id={id} />
      ))}
      {visibleBearIds.map(id => (
          <ConnectedBear key={id} id={id} />
      ))}
      {campfireIds.map(id => (
          <ConnectedCampfire key={id} id={id} />
      ))}
    </group>
  );
});
