import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { DeathCause } from '../game/state';

const DEATH_MESSAGES: Record<string, string[]> = {
  looked: [
    'You looked too long.',
    'It saw you seeing it.',
    'Your attention gave it form.',
    'You made it real.',
    'You stared into the void. It stared back.',
  ],
  ignored: [
    "You didn't look. It came anyway.",
    "Ignoring it didn't make it go away.",
    "What you don't see can still find you.",
    "The dark doesn't need your permission.",
    'It was patient. You were not.',
  ],
  insanity: [
    "Your mind couldn't take it.",
    'Reality became suggestion.',
    'You forgot what was real.',
    'The line between you and it dissolved.',
    'Your thoughts consumed you.',
  ],
};

interface DeathScreenProps {
  cause: DeathCause;
  timeAlive: number;
  roomsCleared: number;
  onRestart: () => void;
}

export function DeathScreen({ cause, timeAlive, roomsCleared, onRestart }: DeathScreenProps) {
  const flashOpacity = useRef(new Animated.Value(1)).current;
  const messageOpacity = useRef(new Animated.Value(0)).current;
  const statsOpacity = useRef(new Animated.Value(0)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;

  const messages = DEATH_MESSAGES[cause || 'looked'];
  const message = messages[Math.floor(Math.random() * messages.length)];

  useEffect(() => {
    Animated.sequence([
      // White flash
      Animated.timing(flashOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.delay(1000),
      // Death message
      Animated.timing(messageOpacity, { toValue: 1, duration: 1500, useNativeDriver: true }),
      Animated.delay(500),
      // Stats
      Animated.timing(statsOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.delay(1000),
      // Button
      Animated.timing(buttonOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleRestart = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onRestart();
  };

  return (
    <View style={styles.container}>
      {/* White flash */}
      <Animated.View style={[styles.flash, { opacity: flashOpacity }]} />

      {/* Death message */}
      <Animated.Text style={[styles.message, { opacity: messageOpacity }]}>
        {message}
      </Animated.Text>

      {/* Stats */}
      <Animated.View style={[styles.stats, { opacity: statsOpacity }]}>
        <Text style={styles.statText}>
          Survived {Math.floor(timeAlive)} seconds
        </Text>
        {roomsCleared > 0 && (
          <Text style={styles.statText}>
            Rooms cleared: {roomsCleared}
          </Text>
        )}
      </Animated.View>

      {/* Restart button */}
      <Animated.View style={[styles.buttonContainer, { opacity: buttonOpacity }]}>
        <TouchableOpacity onPress={handleRestart} activeOpacity={0.6}>
          <Text style={styles.buttonText}>try not to think about it</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  flash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
  },
  message: {
    fontSize: 24,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    fontWeight: '300',
    letterSpacing: 1,
    lineHeight: 36,
  },
  stats: {
    marginTop: 40,
    alignItems: 'center',
    gap: 8,
  },
  statText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.25)',
    letterSpacing: 2,
  },
  buttonContainer: {
    marginTop: 60,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  buttonText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 2,
  },
});
