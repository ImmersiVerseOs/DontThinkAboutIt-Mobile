// Game Engine — runs the game loop, manages state transitions
// This replaces the useRef/useCallback loop from the web version
// with a clean engine class that works with React Native

import * as Haptics from 'expo-haptics';
import {
  GameState,
  INITIAL_STATE,
  DeathCause,
  updateFear,
  updateSanity,
  updateHiddenDanger,
  getDistortion,
  shouldSpawnEntity,
  createEntity,
  updateEntity,
  checkDeath,
  getDifficulty,
} from './state';

type StateListener = (state: GameState) => void;

export class GameEngine {
  private state: GameState;
  private listeners: Set<StateListener> = new Set();
  private animFrameId: number | null = null;
  private lastTime: number = 0;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.state = { ...INITIAL_STATE };
  }

  getState(): GameState {
    return this.state;
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  // ─── Game Lifecycle ─────────────────────────────────────

  start() {
    this.state = {
      ...INITIAL_STATE,
      gamePhase: 'playing',
      sanity: 100,
      fear: 0,
      hiddenDanger: 0,
      entities: [],
      timeAlive: 0,
      roomIndex: 0,
      roomsCleared: 0,
      difficulty: 1,
      deathCause: null,
      flashlightCharges: 3,
    };
    this.lastTime = performance.now();
    this.notify();
    this.startLoop();
    this.startHeartbeat();
  }

  restart() {
    this.stop();
    this.start();
  }

  stop() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  showTitle() {
    this.stop();
    this.state = { ...INITIAL_STATE };
    this.notify();
  }

  // ─── Input ──────────────────────────────────────────────

  setFocus(x: number, y: number) {
    this.state.playerFocus = { x, y };
    this.state.isLooking = true;
  }

  setLooking(looking: boolean) {
    this.state.isLooking = looking;
  }

  setCameraRotation(x: number, y: number) {
    this.state.cameraRotation = { x, y };
  }

  useFlashlight() {
    if (this.state.flashlightCharges <= 0 || this.state.flashlightActive) return;
    this.state.flashlightCharges--;
    this.state.flashlightActive = true;
    this.state.flashlightTimer = 2; // 2 seconds of light
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }

  // ─── Game Loop ──────────────────────────────────────────

  private startLoop() {
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - this.lastTime) / 1000);
      this.lastTime = now;

      if (this.state.gamePhase !== 'playing') return;

      this.update(dt);
      this.notify();

      this.animFrameId = requestAnimationFrame(tick);
    };

    this.animFrameId = requestAnimationFrame(tick);
  }

  private update(dt: number) {
    // Time
    this.state.timeAlive += dt;

    // Flashlight timer
    if (this.state.flashlightActive) {
      this.state.flashlightTimer -= dt;
      if (this.state.flashlightTimer <= 0) {
        this.state.flashlightActive = false;
        this.state.flashlightTimer = 0;
      }
    }

    // Update entities
    this.state.entities = this.state.entities.map((entity) => {
      if (!entity.active) return entity;

      const isFocused = this.isEntityFocused(entity);
      const updated = updateEntity(entity, isFocused, dt, this.state);

      // Track behavior
      if (isFocused && entity.visibility > 0.3) {
        this.state.behaviors.investigates++;
      } else if (!isFocused && entity.visibility > 0.3) {
        this.state.behaviors.avoidsThreats++;
      }

      // Haptic when entity becomes dangerous
      if (updated.dangerous && !entity.dangerous) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }

      // Haptic when entity first becomes visible
      if (updated.visibility > 0.3 && !updated.hapticPlayed) {
        updated.hapticPlayed = true;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      return updated;
    });

    // Remove dead entities
    this.state.entities = this.state.entities.filter((e) => e.active);

    // Spawn new entities
    if (shouldSpawnEntity(this.state)) {
      this.state.entities.push(createEntity(this.state));
    }

    // Update systems
    this.state.fear = updateFear(this.state, dt);
    this.state.sanity = updateSanity(this.state, dt);
    this.state.hiddenDanger = updateHiddenDanger(this.state, dt);
    this.state.distortionLevel = getDistortion(this.state.sanity);
    this.state.breathingIntensity = 0.1 + this.state.fear / 200;

    // Room progression (every 30s / difficulty)
    const roomThreshold = 30 / this.state.difficulty;
    const newRoom = Math.floor(this.state.timeAlive / roomThreshold);
    if (newRoom > this.state.roomIndex) {
      this.state.roomIndex = newRoom;
      this.state.roomsCleared = newRoom;
      this.state.difficulty = getDifficulty(newRoom);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }

    // Death check
    const deathCause = checkDeath(this.state);
    if (deathCause) {
      this.die(deathCause);
    }
  }

  private die(cause: DeathCause) {
    this.state.gamePhase = 'death';
    this.state.deathCause = cause;
    this.stop();

    // Death haptic
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }, 200);

    this.notify();
  }

  private isEntityFocused(entity: Entity): boolean {
    if (!this.state.isLooking) return false;

    // Convert entity 3D position to approximate screen position
    // Simple projection: map world XZ to screen XY based on camera rotation
    const dx = entity.position.x;
    const dz = entity.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist === 0) return false;

    // Angle from camera forward to entity
    const entityAngle = Math.atan2(dx, -dz);
    const cameraAngle = this.state.cameraRotation.y;
    let angleDiff = entityAngle - cameraAngle;

    // Normalize to -PI to PI
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    // Project to screen space (FOV ~75 degrees = 1.3 radians)
    const fov = 1.3;
    const screenX = 0.5 + angleDiff / fov;
    const screenY = 0.5 - (entity.position.y - 1.6) / (dist * Math.tan(fov / 2));

    // Store for rendering
    entity.screenPosition = { x: screenX, y: screenY };

    // Check if player focus is near this entity
    const focusDist = Math.sqrt(
      (this.state.playerFocus.x - screenX) ** 2 +
      (this.state.playerFocus.y - screenY) ** 2,
    );

    return focusDist < 0.15; // ~15% of screen = "focused"
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.state.gamePhase !== 'playing') return;
      if (this.state.fear > 30) {
        const intensity =
          this.state.fear > 70
            ? Haptics.ImpactFeedbackStyle.Heavy
            : Haptics.ImpactFeedbackStyle.Medium;
        Haptics.impactAsync(intensity);
        setTimeout(() => Haptics.impactAsync(intensity), 150);
      }
    }, 800);
  }
}

// Singleton
export const gameEngine = new GameEngine();
