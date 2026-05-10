import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { supabase } from '../lib/supabase';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlocked_at?: string;
}

interface Props {
  profileId: string | null;
  onBack: () => void;
}

export function AchievementsScreen({ profileId, onBack }: Props) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  useEffect(() => {
    loadAchievements();
  }, [profileId]);

  const loadAchievements = async () => {
    const { data: all } = await supabase.from('achievements').select('*').order('id');
    if (!all) return;

    let unlocked: string[] = [];
    if (profileId) {
      const { data: pa } = await supabase
        .from('player_achievements')
        .select('achievement_id, unlocked_at')
        .eq('profile_id', profileId);
      if (pa) unlocked = pa.map((p: any) => p.achievement_id);
    }

    setAchievements(
      all.map((a: any) => ({
        ...a,
        unlocked: unlocked.includes(a.id),
      })),
    );
  };

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backBtn}>{'←'}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>ACHIEVEMENTS</Text>
        <Text style={styles.count}>{unlockedCount}/{achievements.length}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {achievements.map((ach) => (
          <View key={ach.id} style={[styles.card, !ach.unlocked && styles.cardLocked]}>
            <Text style={styles.icon}>{ach.unlocked ? ach.icon : '🔒'}</Text>
            <View style={styles.info}>
              <Text style={[styles.name, !ach.unlocked && styles.nameLocked]}>
                {ach.name}
              </Text>
              <Text style={styles.desc}>{ach.description}</Text>
            </View>
            {ach.unlocked && <Text style={styles.check}>✓</Text>}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
  backBtn: { fontSize: 24, color: 'rgba(255,255,255,0.5)' },
  title: { fontSize: 16, color: 'rgba(255,255,255,0.6)', letterSpacing: 4, fontWeight: '700' },
  count: { fontSize: 14, color: 'rgba(200,0,0,0.5)', fontWeight: '700' },
  list: { paddingHorizontal: 20, gap: 8, paddingBottom: 40 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 16, gap: 14 },
  cardLocked: { opacity: 0.35 },
  icon: { fontSize: 28, width: 40, textAlign: 'center' },
  info: { flex: 1, gap: 2 },
  name: { fontSize: 15, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },
  nameLocked: { color: 'rgba(255,255,255,0.4)' },
  desc: { fontSize: 12, color: 'rgba(255,255,255,0.3)' },
  check: { fontSize: 18, color: 'rgba(0,180,0,0.6)' },
});
