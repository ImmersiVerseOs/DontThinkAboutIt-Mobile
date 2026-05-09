// Main App — state machine for game phases
import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { TitleScreen } from '../components/TitleScreen';
import { GameScreen } from '../components/GameScreen';
import { DeathScreen } from '../components/DeathScreen';
import { gameEngine } from '../game/engine';
import { gameAudio } from '../game/audio';
import type { GameState, GamePhase } from '../game/state';

export default function App() {
  const [phase, setPhase] = useState<GamePhase>('title');
  const [deathState, setDeathState] = useState<{
    cause: GameState['deathCause'];
    time: number;
    rooms: number;
  }>({ cause: null, time: 0, rooms: 0 });

  useEffect(() => {
    gameAudio.init();

    const unsub = gameEngine.subscribe((state) => {
      if (state.gamePhase !== phase) {
        setPhase(state.gamePhase);

        if (state.gamePhase === 'death') {
          setDeathState({
            cause: state.deathCause,
            time: state.timeAlive,
            rooms: state.roomsCleared,
          });
        }
      }
    });

    return () => {
      unsub();
      gameEngine.stop();
    };
  }, []);

  const handleStart = () => {
    gameEngine.start();
  };

  const handleRestart = () => {
    gameEngine.restart();
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {phase === 'title' && <TitleScreen onStart={handleStart} />}

      {phase === 'playing' && <GameScreen />}

      {phase === 'death' && (
        <DeathScreen
          cause={deathState.cause}
          timeAlive={deathState.time}
          roomsCleared={deathState.rooms}
          onRestart={handleRestart}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});
