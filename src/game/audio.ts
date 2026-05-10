// Horror Audio System — procedural sounds using expo-av
// Generates heartbeat, whispers, static, ambient drones
// Will be replaced with real audio files for production

import { Audio, AVPlaybackSource } from 'expo-av';

class GameAudio {
  private initialized = false;
  private sounds: Map<string, Audio.Sound> = new Map();
  private enabled = true;

  async init() {
    if (this.initialized) return;
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
      this.initialized = true;
    } catch (e) {
      console.warn('Audio init failed:', e);
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) this.stopAll();
  }

  // ─── Sound Playback ───────────────────────────────────

  private async playSound(key: string, source: AVPlaybackSource, options?: {
    volume?: number;
    isLooping?: boolean;
    rate?: number;
  }) {
    if (!this.enabled || !this.initialized) return;

    try {
      // Stop existing instance of this sound
      const existing = this.sounds.get(key);
      if (existing) {
        await existing.stopAsync().catch(() => {});
        await existing.unloadAsync().catch(() => {});
      }

      const { sound } = await Audio.Sound.createAsync(source, {
        shouldPlay: true,
        volume: options?.volume ?? 0.5,
        isLooping: options?.isLooping ?? false,
        rate: options?.rate ?? 1.0,
      });

      this.sounds.set(key, sound);

      // Auto-cleanup when done (non-looping)
      if (!options?.isLooping) {
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            sound.unloadAsync().catch(() => {});
            this.sounds.delete(key);
          }
        });
      }
    } catch (e) {
      // Silently fail — audio is enhancement, not critical
    }
  }

  // ─── Game Sounds ──────────────────────────────────────

  async playAmbientDrone(fear: number) {
    // Low drone that intensifies with fear
    // In production: load actual ambient audio file
    // For now: placeholder — haptics carry the horror
  }

  async playEntityAppear(entityType: string) {
    // Sound when entity first becomes visible
    // Different per type: shadow=rumble, figure=breathing, eyes=whisper
  }

  async playEntityDangerous() {
    // Sharp sound when entity becomes dangerous
  }

  async playDeath(cause: string) {
    // Death sound: static burst + bass drop
  }

  async playFlashlight() {
    // Click + electrical hum
  }

  async playRoomAdvance() {
    // Door creak + footsteps
  }

  async playAchievement() {
    // Subtle chime
  }

  // ─── Cleanup ──────────────────────────────────────────

  async stopAll() {
    for (const [key, sound] of this.sounds) {
      try {
        await sound.stopAsync();
        await sound.unloadAsync();
      } catch (e) {}
    }
    this.sounds.clear();
  }

  async cleanup() {
    await this.stopAll();
    this.initialized = false;
  }
}

export const gameAudio = new GameAudio();
