import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { DeathCause } from '../game/state';

interface Props {
  cause: DeathCause;
  timeAlive: number;
  roomsCleared: number;
  playerName?: string;
}

const CAUSE_CONFIG = {
  looked: { emoji: '👁️', color: 'rgba(200,0,0,0.6)', label: 'LOOKED TOO LONG' },
  ignored: { emoji: '🙈', color: 'rgba(100,100,200,0.6)', label: 'IGNORED THE DARK' },
  insanity: { emoji: '🌀', color: 'rgba(150,0,150,0.6)', label: 'LOST MY MIND' },
};

export function ShareDeathCard({ cause, timeAlive, roomsCleared, playerName }: Props) {
  const config = CAUSE_CONFIG[cause || 'looked'];

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const message = [
      `${config.emoji} ${config.label}`,
      ``,
      `I survived ${Math.floor(timeAlive)} seconds in Don't Think About It`,
      roomsCleared > 0 ? `Cleared ${roomsCleared} rooms` : '',
      ``,
      `What you focus on becomes real.`,
      `#DontThinkAboutIt #HorrorGame`,
    ].filter(Boolean).join('\n');

    await Share.share({ message, title: "Don't Think About It" });
  };

  return (
    <TouchableOpacity style={styles.card} onPress={handleShare} activeOpacity={0.8}>
      <View style={[styles.inner, { borderColor: config.color }]}>
        <Text style={styles.brandText}>DON'T THINK ABOUT IT</Text>

        <Text style={styles.emoji}>{config.emoji}</Text>
        <Text style={[styles.causeText, { color: config.color }]}>{config.label}</Text>

        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{Math.floor(timeAlive)}s</Text>
            <Text style={styles.statLabel}>survived</Text>
          </View>
          {roomsCleared > 0 && (
            <View style={styles.stat}>
              <Text style={styles.statValue}>{roomsCleared}</Text>
              <Text style={styles.statLabel}>rooms</Text>
            </View>
          )}
        </View>

        <Text style={styles.shareHint}>tap to share</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 40 },
  inner: {
    borderWidth: 1, borderRadius: 16, padding: 24,
    backgroundColor: 'rgba(255,255,255,0.02)', alignItems: 'center', gap: 12,
  },
  brandText: { fontSize: 10, color: 'rgba(255,255,255,0.15)', letterSpacing: 4, fontWeight: '700' },
  emoji: { fontSize: 40, marginTop: 8 },
  causeText: { fontSize: 14, fontWeight: '800', letterSpacing: 3 },
  stats: { flexDirection: 'row', gap: 32, marginTop: 8 },
  stat: { alignItems: 'center', gap: 2 },
  statValue: { fontSize: 24, fontWeight: '800', color: 'rgba(255,255,255,0.7)', fontVariant: ['tabular-nums'] },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: 2 },
  shareHint: { fontSize: 10, color: 'rgba(255,255,255,0.1)', letterSpacing: 2, marginTop: 8 },
});
