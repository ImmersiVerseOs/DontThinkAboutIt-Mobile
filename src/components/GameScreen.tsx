// Main Game Screen — wraps 3D scene with touch controls + HUD
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, StyleSheet, Dimensions, PanResponder } from 'react-native';
import { Scene3D } from '../game/Scene3D';
import { HUD } from './HUD';
import { gameEngine } from '../game/engine';
import type { GameState } from '../game/state';

const { width, height } = Dimensions.get('window');

// Touch sensitivity
const TOUCH_SENSITIVITY = 0.003;
const IDLE_TIMEOUT = 2000; // ms before considered "not looking"

export function GameScreen() {
  const [state, setState] = useState<GameState>(gameEngine.getState());
  const cameraYaw = useRef(0);
  const cameraPitch = useRef(0);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsub = gameEngine.subscribe((newState) => {
      setState({ ...newState });
    });
    return unsub;
  }, []);

  const resetIdleTimer = useCallback(() => {
    gameEngine.setLooking(true);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      gameEngine.setLooking(false);
    }, IDLE_TIMEOUT);
  }, []);

  // Pan responder for camera control
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        resetIdleTimer();
      },
      onPanResponderMove: (_evt, gestureState) => {
        cameraYaw.current += gestureState.dx * TOUCH_SENSITIVITY;
        cameraPitch.current = Math.max(
          -0.5,
          Math.min(0.5, cameraPitch.current + gestureState.dy * TOUCH_SENSITIVITY),
        );

        gameEngine.setCameraRotation(cameraPitch.current, cameraYaw.current);

        // Convert touch position to normalized screen coords
        const touchX = (gestureState.moveX || 0) / width;
        const touchY = (gestureState.moveY || 0) / height;
        gameEngine.setFocus(touchX, touchY);

        resetIdleTimer();
      },
      onPanResponderRelease: () => {
        // Start idle countdown
        resetIdleTimer();
      },
    }),
  ).current;

  const handleFlashlight = () => {
    gameEngine.useFlashlight();
  };

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      {/* 3D Scene */}
      <Scene3D state={state} width={width} height={height} />

      {/* HUD overlay */}
      <HUD state={state} onFlashlight={handleFlashlight} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});
