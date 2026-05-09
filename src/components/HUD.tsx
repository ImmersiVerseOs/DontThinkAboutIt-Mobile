import React from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import type { GameState } from '../game/state';

const { width, height } = Dimensions.get('window');

interface HUDProps {
  state: GameState;
  onFlashlight: () => void;
}

export function HUD({ state, onFlashlight }: HUDProps) {
  const fearColor = `rgba(${80 + state.fear * 1.5}, 0, 0, ${state.fear / 200})`;

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Fear vignette — red edges */}
      <View
        style={[
          styles.vignette,
          {
            shadowColor: 'red',
            shadowRadius: 50 + state.fear,
            shadowOpacity: state.fear / 150,
          },
        ]}
        pointerEvents="none"
      />

      {/* Sanity static overlay */}
      {state.sanity < 50 && (
        <View
          style={[
            styles.staticOverlay,
            { opacity: (50 - state.sanity) / 100 },
          ]}
          pointerEvents="none"
        />
      )}

      {/* Distortion red tint */}
      {state.distortionLevel > 0 && (
        <View
          style={[
            styles.distortionOverlay,
            { opacity: state.distortionLevel * 0.3 },
          ]}
          pointerEvents="none"
        />
      )}

      {/* Flashlight active indicator */}
      {state.flashlightActive && (
        <View style={styles.flashlightGlow} pointerEvents="none" />
      )}

      {/* Bottom left — stats */}
      <View style={styles.bottomLeft}>
        {/* Fear bar */}
        <View style={styles.barContainer}>
          <Text style={styles.barLabel}>FEAR</Text>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, styles.fearBar, { width: `${state.fear}%` }]} />
          </View>
        </View>

        {/* Sanity bar */}
        <View style={styles.barContainer}>
          <Text style={styles.barLabel}>MIND</Text>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, styles.sanityBar, { width: `${state.sanity}%` }]} />
          </View>
        </View>

        {/* Hidden danger */}
        {state.hiddenDanger > 30 && (
          <Text style={[styles.dangerText, { opacity: Math.sin(Date.now() * 0.003) > 0 ? 0.8 : 0.2 }]}>
            something is wrong
          </Text>
        )}
      </View>

      {/* Top right — timer */}
      <View style={styles.topRight}>
        <Text style={styles.timer}>{Math.floor(state.timeAlive)}s</Text>
        {state.roomsCleared > 0 && (
          <Text style={styles.roomText}>Room {state.roomIndex + 1}</Text>
        )}
      </View>

      {/* Bottom right — flashlight */}
      {state.flashlightCharges > 0 && !state.flashlightActive && (
        <TouchableOpacity style={styles.flashlightBtn} onPress={onFlashlight}>
          <Text style={styles.flashlightIcon}>🔦</Text>
          <Text style={styles.flashlightCount}>{state.flashlightCharges}</Text>
        </TouchableOpacity>
      )}

      {/* Center crosshair */}
      <View style={styles.crosshair} pointerEvents="none">
        <View style={[styles.crosshairDot, { shadowRadius: 4 + state.fear / 10 }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 60,
    borderColor: 'transparent',
  },
  staticOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  distortionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(150, 0, 0, 0.15)',
  },
  flashlightGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 200, 0.08)',
  },
  bottomLeft: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    gap: 8,
  },
  barContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 2,
    width: 32,
  },
  barTrack: {
    width: 80,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 2,
  },
  fearBar: {
    backgroundColor: 'rgba(200, 0, 0, 0.7)',
  },
  sanityBar: {
    backgroundColor: 'rgba(100, 100, 255, 0.5)',
  },
  dangerText: {
    fontSize: 10,
    color: 'rgba(200, 0, 0, 0.6)',
    letterSpacing: 3,
    marginTop: 4,
  },
  topRight: {
    position: 'absolute',
    top: 60,
    right: 20,
    alignItems: 'flex-end',
  },
  timer: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.2)',
    fontVariant: ['tabular-nums'],
  },
  roomText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.15)',
    letterSpacing: 1,
    marginTop: 4,
  },
  flashlightBtn: {
    position: 'absolute',
    bottom: 50,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  flashlightIcon: { fontSize: 18 },
  flashlightCount: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '700',
  },
  crosshair: {
    position: 'absolute',
    top: height / 2 - 3,
    left: width / 2 - 3,
  },
  crosshairDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
  },
});
