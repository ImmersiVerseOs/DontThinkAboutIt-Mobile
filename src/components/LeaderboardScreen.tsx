import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions,
} from 'react-native';
import { supabase } from '../lib/supabase';

const { width } = Dimensions.get('window');

type Tab = 'alltime' | 'daily' | 'ghosts';

interface LeaderboardEntry {
  username: string;
  best_time: number;
  best_room: number;
  total_games: number;
}

interface GhostDeath {
  death_cause: string;
  time_alive: number;
  death_room: number;
  created_at: string;
}

interface Props {
  onBack: () => void;
}

export function LeaderboardScreen({ onBack }: Props) {
  const [tab, setTab] = useState<Tab>('alltime');
  const [alltime, setAlltime] = useState<LeaderboardEntry[]>([]);
  const [daily, setDaily] = useState<LeaderboardEntry[]>([]);
  const [ghosts, setGhosts] = useState<GhostDeath[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: at } = await supabase
      .from('leaderboard_alltime').select('*').order('best_time', { ascending: false }).limit(50);
    if (at) setAlltime(at);

    const { data: d } = await supabase
      .from('leaderboard_daily').select('*')
      .eq('day_date', new Date().toISOString().split('T')[0])
      .order('best_time', { ascending: false }).limit(50);
    if (d) setDaily(d);

    const { data: g } = await supabase
      .from('ghost_deaths').select('*').order('created_at', { ascending: false }).limit(100);
    if (g) setGhosts(g);
  };

  const causeEmoji = (c: string) => c === 'looked' ? '👁️' : c === 'ignored' ? '🙈' : '🌀';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backBtn}>{'←'}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>LEADERBOARD</Text>
        <View style={{ width: 30 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['alltime', 'daily', 'ghosts'] as Tab[]).map((t) => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'alltime' ? 'All Time' : t === 'daily' ? 'Today' : 'Ghosts'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {tab === 'ghosts' ? (
          ghosts.length === 0 ? (
            <Text style={styles.emptyText}>No ghosts yet. Be the first to die.</Text>
          ) : (
            ghosts.map((g, i) => (
              <View key={i} style={styles.ghostRow}>
                <Text style={styles.ghostEmoji}>{causeEmoji(g.death_cause)}</Text>
                <View style={styles.ghostInfo}>
                  <Text style={styles.ghostCause}>{g.death_cause}</Text>
                  <Text style={styles.ghostMeta}>Room {g.death_room} • {Math.floor(g.time_alive)}s</Text>
                </View>
                <Text style={styles.ghostTime}>{new Date(g.created_at).toLocaleDateString()}</Text>
              </View>
            ))
          )
        ) : (
          (tab === 'alltime' ? alltime : daily).length === 0 ? (
            <Text style={styles.emptyText}>No entries yet. Play to get on the board.</Text>
          ) : (
            (tab === 'alltime' ? alltime : daily).map((entry, i) => (
              <View key={i} style={styles.row}>
                <Text style={[styles.rank, i < 3 && styles.rankTop]}>{i + 1}</Text>
                <View style={styles.info}>
                  <Text style={styles.name}>{entry.username || 'Anonymous'}</Text>
                  <Text style={styles.meta}>Room {entry.best_room} • {entry.total_games} games</Text>
                </View>
                <Text style={styles.time}>{Math.floor(entry.best_time)}s</Text>
              </View>
            ))
          )
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
  tabs: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center' },
  tabActive: { backgroundColor: 'rgba(180,0,0,0.2)', borderWidth: 1, borderColor: 'rgba(180,0,0,0.3)' },
  tabText: { fontSize: 13, color: 'rgba(255,255,255,0.3)', fontWeight: '600' },
  tabTextActive: { color: 'rgba(255,255,255,0.8)' },
  list: { paddingHorizontal: 20, gap: 6, paddingBottom: 40 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 14, gap: 12 },
  rank: { fontSize: 18, fontWeight: '800', color: 'rgba(255,255,255,0.2)', width: 32, textAlign: 'center' },
  rankTop: { color: 'rgba(200,0,0,0.7)' },
  info: { flex: 1, gap: 2 },
  name: { fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
  meta: { fontSize: 11, color: 'rgba(255,255,255,0.25)' },
  time: { fontSize: 20, fontWeight: '800', color: 'rgba(200,0,0,0.6)', fontVariant: ['tabular-nums'] },
  ghostRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 10, padding: 12, gap: 12 },
  ghostEmoji: { fontSize: 24, width: 32, textAlign: 'center' },
  ghostInfo: { flex: 1, gap: 2 },
  ghostCause: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.6)', textTransform: 'capitalize' },
  ghostMeta: { fontSize: 11, color: 'rgba(255,255,255,0.2)' },
  ghostTime: { fontSize: 11, color: 'rgba(255,255,255,0.15)' },
  emptyText: { fontSize: 14, color: 'rgba(255,255,255,0.2)', textAlign: 'center', marginTop: 60 },
});
