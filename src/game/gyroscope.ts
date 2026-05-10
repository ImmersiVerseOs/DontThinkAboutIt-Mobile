// Gyroscope Controls — tilt phone to look around
// Uses expo-sensors for device motion

import { Gyroscope } from 'expo-sensors';
import type { Subscription } from 'expo-sensors/build/DeviceSensor';

const SENSITIVITY = 0.015;
const SMOOTHING = 0.3; // lower = smoother

class GyroscopeControls {
  private subscription: Subscription | null = null;
  private enabled = false;
  private yaw = 0;
  private pitch = 0;
  private targetYaw = 0;
  private targetPitch = 0;
  private onUpdate: ((pitch: number, yaw: number) => void) | null = null;
  private animFrame: number | null = null;
  private sensitivity = SENSITIVITY;

  async start(callback: (pitch: number, yaw: number) => void) {
    this.onUpdate = callback;
    this.enabled = true;
    this.yaw = 0;
    this.pitch = 0;
    this.targetYaw = 0;
    this.targetPitch = 0;

    const available = await Gyroscope.isAvailableAsync();
    if (!available) {
      console.warn('Gyroscope not available');
      return false;
    }

    Gyroscope.setUpdateInterval(16); // ~60fps

    this.subscription = Gyroscope.addListener((data) => {
      if (!this.enabled) return;

      // Accumulate rotation
      // x = pitch (tilt forward/back)
      // y = yaw (turn left/right)
      // z = roll (tilt sideways, ignore)
      this.targetYaw += data.y * this.sensitivity;
      this.targetPitch = Math.max(
        -0.5,
        Math.min(0.5, this.targetPitch + data.x * this.sensitivity),
      );
    });

    // Smooth update loop
    const update = () => {
      if (!this.enabled) return;

      // Lerp toward target
      this.yaw += (this.targetYaw - this.yaw) * SMOOTHING;
      this.pitch += (this.targetPitch - this.pitch) * SMOOTHING;

      this.onUpdate?.(this.pitch, this.yaw);
      this.animFrame = requestAnimationFrame(update);
    };
    this.animFrame = requestAnimationFrame(update);

    return true;
  }

  stop() {
    this.enabled = false;
    this.subscription?.remove();
    this.subscription = null;
    if (this.animFrame) {
      cancelAnimationFrame(this.animFrame);
      this.animFrame = null;
    }
    this.onUpdate = null;
  }

  setSensitivity(value: number) {
    this.sensitivity = value * SENSITIVITY;
  }

  reset() {
    this.yaw = 0;
    this.pitch = 0;
    this.targetYaw = 0;
    this.targetPitch = 0;
  }

  isEnabled() {
    return this.enabled;
  }
}

export const gyroscopeControls = new GyroscopeControls();
