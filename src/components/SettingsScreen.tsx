import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, Alert, Linking } from 'react-native';

interface Props {
  settings: {
    gyroscope: boolean;
    haptics: boolean;
    audio: boolean;
  };
  onUpdateSetting: (key: string, value: boolean) => void;
  onBack: () => void;
  onDeleteAccount: () => void;
}

export function SettingsScreen({ settings, onUpdateSetting, onBack, onDeleteAccount }: Props) {
  const handleDelete = () => {
    Alert.alert('Delete Account', 'All your data, scores, and achievements will be permanently deleted.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete Forever', style: 'destructive', onPress: onDeleteAccount },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backBtn}>{'←'}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>SETTINGS</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Controls */}
        <Text style={styles.section}>CONTROLS</Text>
        <ToggleRow label="Gyroscope" sublabel="Tilt phone to look around" value={settings.gyroscope} onChange={(v) => onUpdateSetting('gyroscope', v)} />
        <ToggleRow label="Haptics" sublabel="Vibration feedback" value={settings.haptics} onChange={(v) => onUpdateSetting('haptics', v)} />
        <ToggleRow label="Audio" sublabel="Sound effects" value={settings.audio} onChange={(v) => onUpdateSetting('audio', v)} />

        {/* Legal */}
        <Text style={styles.section}>LEGAL</Text>
        <LinkRow label="Privacy Policy" onPress={() => Linking.openURL('https://dontthinkaboutit.game/privacy')} />
        <LinkRow label="Terms of Service" onPress={() => Linking.openURL('https://dontthinkaboutit.game/terms')} />

        {/* About */}
        <Text style={styles.section}>ABOUT</Text>
        <View style={styles.aboutRow}>
          <Text style={styles.aboutLabel}>Version</Text>
          <Text style={styles.aboutValue}>1.0.0</Text>
        </View>
        <View style={styles.aboutRow}>
          <Text style={styles.aboutLabel}>By</Text>
          <Text style={styles.aboutValue}>ImmersiVerse OS</Text>
        </View>

        {/* Danger zone */}
        <Text style={[styles.section, { marginTop: 40 }]}>DANGER ZONE</Text>
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Text style={styles.deleteText}>Delete Account</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>what you focus on becomes real</Text>
      </ScrollView>
    </View>
  );
}

function ToggleRow({ label, sublabel, value, onChange }: { label: string; sublabel: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleInfo}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.toggleSub}>{sublabel}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ false: '#1a1a1a', true: 'rgba(180,0,0,0.4)' }} thumbColor={value ? '#cc0000' : '#555'} />
    </View>
  );
}

function LinkRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.linkRow} onPress={onPress}>
      <Text style={styles.linkLabel}>{label}</Text>
      <Text style={styles.linkArrow}>→</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
  backBtn: { fontSize: 24, color: 'rgba(255,255,255,0.5)' },
  title: { fontSize: 16, color: 'rgba(255,255,255,0.6)', letterSpacing: 4, fontWeight: '700' },
  content: { paddingHorizontal: 20, paddingBottom: 60 },
  section: { fontSize: 11, color: 'rgba(255,255,255,0.2)', letterSpacing: 3, fontWeight: '700', marginTop: 24, marginBottom: 12 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  toggleInfo: { flex: 1, gap: 2 },
  toggleLabel: { fontSize: 15, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  toggleSub: { fontSize: 11, color: 'rgba(255,255,255,0.2)' },
  linkRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  linkLabel: { fontSize: 15, color: 'rgba(255,255,255,0.6)' },
  linkArrow: { fontSize: 15, color: 'rgba(255,255,255,0.2)' },
  aboutRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  aboutLabel: { fontSize: 14, color: 'rgba(255,255,255,0.3)' },
  aboutValue: { fontSize: 14, color: 'rgba(255,255,255,0.5)', fontWeight: '500' },
  deleteBtn: { borderWidth: 1, borderColor: 'rgba(200,0,0,0.3)', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  deleteText: { fontSize: 14, color: 'rgba(200,0,0,0.7)', fontWeight: '600' },
  footer: { marginTop: 40, fontSize: 11, color: 'rgba(255,255,255,0.08)', textAlign: 'center', letterSpacing: 3 },
});
