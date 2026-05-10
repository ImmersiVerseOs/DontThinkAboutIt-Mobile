import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { supabase } from '../lib/supabase';

interface Challenge {
  id: string;
  title: string;
  description: string;
  modifiers: any;
  challenge_date: string;
}

interface Props {
  profileId: string | null;
  onStartChallenge: (modifiers: any) => void;
  onBack: () => void;
}

export function DailyChallengeScreen({ profileId, onStartChallenge, onBack }: Props) {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  useEffect(() => {
    loadChallenge();
  }, []);

  const loadChallenge = async () => {
    const today = new Date().toISOString().split('T')[0];

    const { data } = await supabase
      .from('daily_challenges')
      .select('*')
      .eq('challenge_date', today)
      .maybeSingle();

    if (data) {
      setChallenge(data);

      // Check if played
      if (profileId) {
        const { data: run } = await supabase
          .from('daily_challenge_runs')
          .select('id')
          .eq('challenge_id', data.id)
          .eq('profile_id', profileId)
          .maybeSingle();
        setHasPlayed(!!run);
      }

      // Load leaderboard
      const { data: lb } = await supabase
        .from('daily_challenge_runs')
        .select('time_alive, rooms_cleared, profile:profiles(username)')
        .eq('challenge_id', data.id)
        .order('time_alive', { ascending: false })
        .limit(20);
      if (lb) setLeaderboard(lb);
    }
  };

  const handleStart = () => {
    if (hasPlayed) {
      Alert.alert('Already Played', "You've used your attempt today. Come back tomorrow!");
      return;
    }
    if (challenge) {
      onStartChallenge(challenge.modifiers);
    }
  };

  const modifierLabels: Record<string, string> = {
    spawn_rate: '⚡ Faster spawns',
    no_flashlight: '🔦 No flashlight',
    max_entities: '👥 More entities',
    fear_multiplier: '😱 Amplified fear',
    sanity_drain: '🧠 Faster sanity loss',
    dark_room: '🌑 Extra dark',
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backBtn}>{'←'}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>DAILY CHALLENGE</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {challenge ? (
          <>
            <View style={styles.challengeCard}>
              <Text style={styles.challengeDate}>
                {new Date(challenge.challenge_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </Text>
              <Text style={styles.challengeTitle}>{challenge.title}</Text>
              <Text style={styles.challengeDesc}>{challenge.description}</Text>

              {/* Modifiers */}
              <View style={styles.modifiers}>
                {Object.entries(challenge.modifiers || {}).map(([key]) => (
                  <View key={key} style={styles.modBadge}>
                    <Text style={styles.modText}>{modifierLabels[key] || key}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.startBtn, hasPlayed && styles.startBtnDisabled]}
                onPress={handleStart}
                disabled={hasPlayed}
              >
                <Text style={styles.startText}>
                  {hasPlayed ? 'Attempt Used' : 'Enter the Dark'}
                </Text>
              </TouchableOpacity>

              {hasPlayed && (
                <Text style={styles.playedText}>Come back tomorrow for a new challenge</Text>
              )}
            </View>

            {/* Today's leaderboard */}
            {leaderboard.length > 0 && (
              <View style={styles.lbSection}>
                <Text style={styles.lbTitle}>TODAY'S RANKINGS</Text>
                {leaderboard.map((entry: any, i) => (
                  <View key={i} style={styles.lbRow}>
                    <Text style={styles.lbRank}>{i + 1}</Text>
                    <Text style={styles.lbName}>{entry.profile?.username || 'Anonymous'}</Text>
                    <Text style={styles.lbTime}>{Math.floor(entry.time_alive)}s</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        ) : (
          <View style={styles.noChallenge}>
            <Text style={styles.noChallengeEmoji}>🌑</Text>
            <Text style={styles.noChallengeText}>No challenge today.</Text>
            <Text style={styles.noChallengeSubtext}>The darkness rests... for now.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
  backBtn: { fontSize: 24, color: 'rgba(255,255,255,0.5)' },
  title: { fontSize: 16, color: 'rgba(255,255,255,0.6)', letterSpacing: 4, fontWeight: '700' },
  content: { paddingHorizontal: 20, paddingBottom: 40, gap: 24 },
  challengeCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 24, borderWidth: 1, borderColor: 'rgba(200,0,0,0.15)', gap: 12, alignItems: 'center' },
  challengeDate: { fontSize: 11, color: 'rgba(255,255,255,0.2)', letterSpacing: 2 },
  challengeTitle: { fontSize: 22, fontWeight: '800', color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
  challengeDesc: { fontSize: 14, color: 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 22 },
  modifiers: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 8 },
  modBadge: { backgroundColor: 'rgba(200,0,0,0.1)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(200,0,0,0.2)' },
  modText: { fontSize: 12, color: 'rgba(200,0,0,0.7)', fontWeight: '600' },
  startBtn: { borderWidth: 1, borderColor: 'rgba(200,0,0,0.4)', borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14, marginTop: 8 },
  startBtnDisabled: { opacity: 0.3 },
  startText: { fontSize: 15, color: 'rgba(200,0,0,0.8)', fontWeight: '700', letterSpacing: 1 },
  playedText: { fontSize: 11, color: 'rgba(255,255,255,0.15)', marginTop: 4 },
  lbSection: { gap: 8 },
  lbTitle: { fontSize: 11, color: 'rgba(255,255,255,0.2)', letterSpacing: 3, fontWeight: '700' },
  lbRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },
  lbRank: { fontSize: 16, fontWeight: '800', color: 'rgba(200,0,0,0.4)', width: 24, textAlign: 'center' },
  lbName: { flex: 1, fontSize: 14, color: 'rgba(255,255,255,0.5)' },
  lbTime: { fontSize: 16, fontWeight: '800', color: 'rgba(200,0,0,0.5)', fontVariant: ['tabular-nums'] },
  noChallenge: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  noChallengeEmoji: { fontSize: 48 },
  noChallengeText: { fontSize: 18, color: 'rgba(255,255,255,0.4)', fontWeight: '600' },
  noChallengeSubtext: { fontSize: 13, color: 'rgba(255,255,255,0.15)' },
});
