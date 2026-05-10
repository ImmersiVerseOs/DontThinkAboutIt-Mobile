import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { supabase } from '../lib/supabase';

interface Tier {
  tier_number: number;
  track: string;
  reward_name: string;
  reward_icon: string;
  reward_type: string;
  xp_required: number;
}

interface Props {
  profileId: string | null;
  onBack: () => void;
}

export function DarknessPassScreen({ profileId, onBack }: Props) {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [currentXP, setCurrentXP] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const [seasonName, setSeasonName] = useState('');

  useEffect(() => {
    loadPassData();
  }, [profileId]);

  const loadPassData = async () => {
    // Get active season
    const { data: season } = await supabase
      .from('darkness_pass_seasons')
      .select('*, tiers:darkness_pass_tiers(*)')
      .eq('status', 'active')
      .maybeSingle();

    if (!season) return;
    setSeasonName(season.season_name);
    setTiers((season.tiers || []).sort((a: any, b: any) => a.tier_number - b.tier_number || (a.track === 'free' ? -1 : 1)));

    if (profileId) {
      const { data: progress } = await supabase
        .from('darkness_pass_progress')
        .select('*')
        .eq('profile_id', profileId)
        .eq('season_id', season.id)
        .maybeSingle();

      if (progress) {
        setCurrentXP(progress.current_xp);
        setIsPremium(progress.is_premium);
      }
    }
  };

  // Group tiers by number
  const tierNumbers = [...new Set(tiers.map((t) => t.tier_number))].sort((a, b) => a - b);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backBtn}>{'←'}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>DARKNESS PASS</Text>
        <View style={{ width: 30 }} />
      </View>

      {/* Season info */}
      <View style={styles.seasonBar}>
        <Text style={styles.seasonName}>{seasonName}</Text>
        <Text style={styles.xpText}>{currentXP} XP</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.min(100, (currentXP / 3500) * 100)}%` }]} />
        </View>
      </View>

      {!isPremium && (
        <TouchableOpacity style={styles.premiumBtn}>
          <Text style={styles.premiumText}>Unlock Premium Track — $4.99</Text>
        </TouchableOpacity>
      )}

      <ScrollView contentContainerStyle={styles.list}>
        {tierNumbers.map((num) => {
          const freeTier = tiers.find((t) => t.tier_number === num && t.track === 'free');
          const premiumTier = tiers.find((t) => t.tier_number === num && t.track === 'premium');
          const unlocked = currentXP >= (freeTier?.xp_required || 0);

          return (
            <View key={num} style={[styles.tierRow, unlocked && styles.tierUnlocked]}>
              {/* Tier number */}
              <View style={[styles.tierNum, unlocked && styles.tierNumUnlocked]}>
                <Text style={[styles.tierNumText, unlocked && styles.tierNumTextUnlocked]}>{num}</Text>
              </View>

              {/* Free track */}
              {freeTier ? (
                <View style={[styles.rewardCard, unlocked && styles.rewardUnlocked]}>
                  <Text style={styles.rewardIcon}>{freeTier.reward_icon}</Text>
                  <Text style={styles.rewardName} numberOfLines={1}>{freeTier.reward_name}</Text>
                  <Text style={styles.trackLabel}>FREE</Text>
                </View>
              ) : <View style={styles.rewardEmpty} />}

              {/* Premium track */}
              {premiumTier ? (
                <View style={[
                  styles.rewardCard,
                  styles.rewardPremium,
                  unlocked && isPremium && styles.rewardUnlocked,
                  !isPremium && styles.rewardLocked,
                ]}>
                  <Text style={styles.rewardIcon}>{premiumTier.reward_icon}</Text>
                  <Text style={styles.rewardName} numberOfLines={1}>{premiumTier.reward_name}</Text>
                  <Text style={styles.trackLabel}>{isPremium ? 'PREMIUM' : '🔒'}</Text>
                </View>
              ) : <View style={styles.rewardEmpty} />}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 12 },
  backBtn: { fontSize: 24, color: 'rgba(255,255,255,0.5)' },
  title: { fontSize: 16, color: 'rgba(255,255,255,0.6)', letterSpacing: 4, fontWeight: '700' },
  seasonBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 8 },
  seasonName: { fontSize: 13, color: 'rgba(200,0,0,0.6)', fontWeight: '600', letterSpacing: 1 },
  xpText: { fontSize: 14, color: 'rgba(255,255,255,0.5)', fontWeight: '700', fontVariant: ['tabular-nums'] },
  progressContainer: { paddingHorizontal: 20, marginBottom: 16 },
  progressTrack: { height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: 'rgba(200,0,0,0.6)', borderRadius: 2 },
  premiumBtn: { alignSelf: 'center', borderWidth: 1, borderColor: 'rgba(200,0,0,0.3)', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10, marginBottom: 16 },
  premiumText: { fontSize: 13, color: 'rgba(200,0,0,0.7)', fontWeight: '600', letterSpacing: 1 },
  list: { paddingHorizontal: 20, gap: 6, paddingBottom: 40 },
  tierRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tierUnlocked: {},
  tierNum: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.04)', justifyContent: 'center', alignItems: 'center' },
  tierNumUnlocked: { backgroundColor: 'rgba(200,0,0,0.15)' },
  tierNumText: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.2)' },
  tierNumTextUnlocked: { color: 'rgba(200,0,0,0.7)' },
  rewardCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 10 },
  rewardPremium: { borderWidth: 1, borderColor: 'rgba(200,0,0,0.15)' },
  rewardUnlocked: { backgroundColor: 'rgba(200,0,0,0.06)' },
  rewardLocked: { opacity: 0.3 },
  rewardEmpty: { flex: 1 },
  rewardIcon: { fontSize: 20 },
  rewardName: { flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  trackLabel: { fontSize: 9, color: 'rgba(255,255,255,0.25)', fontWeight: '700', letterSpacing: 1 },
});
