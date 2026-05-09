import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

interface TitleScreenProps {
  onStart: () => void;
}

export function TitleScreen({ onStart }: TitleScreenProps) {
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(500),
      Animated.parallel([
        Animated.timing(titleOpacity, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(titleY, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ]),
      Animated.delay(500),
      Animated.timing(taglineOpacity, { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.delay(500),
      Animated.timing(buttonOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleStart = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onStart();
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.titleContainer, { opacity: titleOpacity, transform: [{ translateY: titleY }] }]}>
        <Text style={styles.dontText}>DON'T</Text>
        <Text style={styles.thinkText}>THINK</Text>
        <Text style={styles.aboutText}>ABOUT IT</Text>
      </Animated.View>

      <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
        what you focus on becomes real
      </Animated.Text>

      <Animated.View style={[styles.buttonContainer, { opacity: buttonOpacity }]}>
        <TouchableOpacity onPress={handleStart} activeOpacity={0.6}>
          <Text style={styles.buttonText}>Look into the dark</Text>
        </TouchableOpacity>
      </Animated.View>

      <Text style={styles.headphones}>headphones recommended</Text>
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
  titleContainer: {
    alignItems: 'center',
    gap: -8,
  },
  dontText: {
    fontSize: 52,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 8,
    textShadowColor: 'rgba(180, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  thinkText: {
    fontSize: 52,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 8,
    textShadowColor: 'rgba(180, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  aboutText: {
    fontSize: 52,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 8,
    textShadowColor: 'rgba(180, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  tagline: {
    marginTop: 40,
    fontSize: 14,
    color: '#cc0000',
    letterSpacing: 4,
    textTransform: 'lowercase',
  },
  buttonContainer: {
    marginTop: 60,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  buttonText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 2,
  },
  headphones: {
    position: 'absolute',
    bottom: 50,
    fontSize: 11,
    color: 'rgba(255,255,255,0.15)',
    letterSpacing: 3,
  },
});
