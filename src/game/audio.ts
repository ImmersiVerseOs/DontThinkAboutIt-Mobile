// Audio system for mobile — uses expo-av for sound playback
// Procedural audio generation for heartbeat, whispers, static

import { Audio } from 'expo-av';

class GameAudio {
  private initialized = false;

  async init() {
    if (this.initialized) return;
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
    this.initialized = true;
  }

  // Placeholder — will use real audio files in production
  // For now, haptics carry the horror audio feel on mobile
  async playWhisper() {
    // Will load from assets/sounds/whisper.mp3
  }

  async playCreak() {
    // Will load from assets/sounds/creak.mp3
  }

  async playStatic() {
    // Will load from assets/sounds/static.mp3
  }

  async playDeath() {
    // Will load from assets/sounds/death.mp3
  }

  cleanup() {
    // Unload all sounds
  }
}

export const gameAudio = new GameAudio();
