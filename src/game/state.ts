// Core game state — ported from web, adapted for mobile 3D
// The interdependent systems: fear, sanity, hidden danger

export type EntityType = 'shadow' | 'figure' | 'eyes' | 'door' | 'crawler' | 'mirror';

export interface Entity {
  id: string;
  position: { x: number; y: number; z: number };
  type: EntityType;
  visibility: number; // 0 = invisible, 1 = fully manifested
  dangerous: boolean;
  focusTime: number;
  ignoreTime: number;
  soundCue: string | null;
  active: boolean;
  // Mobile additions
  screenPosition?: { x: number; y: number }; // projected 2D position for touch detection
  hapticPlayed: boolean;
  deathType?: 'looked' | 'ignored';
}

export type GamePhase = 'title' | 'playing' | 'death' | 'paused';
export type DeathCause = 'looked' | 'ignored' | 'insanity' | null;

export interface GameState {
  fear: number;
  sanity: number;
  hiddenDanger: number;
  entities: Entity[];
  playerFocus: { x: number; y: number };
  isLooking: boolean;
  gamePhase: GamePhase;
  distortionLevel: number;
  breathingIntensity: number;
  roomIndex: number;
  roomsCleared: number;
  timeAlive: number;
  deathCause: DeathCause;
  // Camera
  cameraRotation: { x: number; y: number };
  // Mobile
  useGyroscope: boolean;
  flashlightCharges: number;
  flashlightActive: boolean;
  flashlightTimer: number;
  // Progression
  difficulty: number; // scales entity speed, spawn rate
  behaviors: {
    turnsAround: number;
    avoidsThreats: number;
    investigates: number;
  };
}

export const INITIAL_STATE: GameState = {
  fear: 0,
  sanity: 100,
  hiddenDanger: 0,
  entities: [],
  playerFocus: { x: 0.5, y: 0.5 },
  isLooking: false,
  gamePhase: 'title',
  distortionLevel: 0,
  breathingIntensity: 0.1,
  roomIndex: 0,
  roomsCleared: 0,
  timeAlive: 0,
  deathCause: null,
  cameraRotation: { x: 0, y: 0 },
  useGyroscope: false,
  flashlightCharges: 3,
  flashlightActive: false,
  flashlightTimer: 0,
  difficulty: 1,
  behaviors: {
    turnsAround: 0,
    avoidsThreats: 0,
    investigates: 0,
  },
};

// ─── Fear System ────────────────────────────────────────────

export function updateFear(state: GameState, dt: number): number {
  let fearDelta = 0;

  for (const entity of state.entities) {
    if (entity.active && entity.visibility > 0.3) {
      fearDelta += entity.visibility * 15 * dt * state.difficulty;
    }
  }

  if (fearDelta === 0) {
    fearDelta = -5 * dt;
  }

  return Math.max(0, Math.min(100, state.fear + fearDelta));
}

// ─── Sanity System ──────────────────────────────────────────

export function updateSanity(state: GameState, dt: number): number {
  let sanityDelta = 0;

  if (state.fear > 60) {
    sanityDelta = -(state.fear - 60) * 0.1 * dt;
  } else if (state.fear < 20) {
    sanityDelta = 2 * dt;
  }

  return Math.max(0, Math.min(100, state.sanity + sanityDelta));
}

// ─── Hidden Danger ──────────────────────────────────────────

export function updateHiddenDanger(state: GameState, dt: number): number {
  let dangerDelta = 0;

  for (const entity of state.entities) {
    if (entity.active && entity.ignoreTime > 3) {
      dangerDelta += 5 * dt * state.difficulty;
    }
  }

  if (state.behaviors.investigates > state.behaviors.avoidsThreats) {
    dangerDelta -= 2 * dt;
  }

  return Math.max(0, Math.min(100, state.hiddenDanger + dangerDelta));
}

// ─── Distortion ─────────────────────────────────────────────

export function getDistortion(sanity: number): number {
  if (sanity > 70) return 0;
  if (sanity > 40) return ((70 - sanity) / 30) * 0.5;
  return 0.5 + ((40 - sanity) / 40) * 0.5;
}

// ─── Entity Spawning ────────────────────────────────────────

export function shouldSpawnEntity(state: GameState): boolean {
  const baseChance = 0.005 * state.difficulty;
  const dangerBonus = state.hiddenDanger * 0.001;
  const fearBonus = state.fear > 50 ? 0.003 : 0;
  const sanityBonus = state.sanity < 40 ? 0.005 : 0;
  const maxEntities = 6 + state.roomIndex;

  if (state.entities.filter((e) => e.active).length >= maxEntities) return false;

  return Math.random() < baseChance + dangerBonus + fearBonus + sanityBonus;
}

export function createEntity(state: GameState): Entity {
  // More entity types unlock as rooms progress
  const baseTypes: EntityType[] = ['shadow', 'figure', 'eyes'];
  if (state.roomIndex >= 3) baseTypes.push('door');
  if (state.roomIndex >= 6) baseTypes.push('crawler');
  if (state.roomIndex >= 10) baseTypes.push('mirror');

  const type = baseTypes[Math.floor(Math.random() * baseTypes.length)];

  const angle = Math.random() * Math.PI * 2;
  const distance = 3 + Math.random() * 5;

  return {
    id: `e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    position: {
      x: Math.cos(angle) * distance,
      y: type === 'eyes' ? 1.5 + Math.random() : type === 'crawler' ? 0.3 : 0,
      z: Math.sin(angle) * distance,
    },
    type,
    visibility: 0,
    dangerous: state.hiddenDanger > 40 || state.fear > 70,
    focusTime: 0,
    ignoreTime: 0,
    soundCue:
      type === 'figure' ? 'breathing' :
      type === 'door' ? 'creak' :
      type === 'crawler' ? 'scratch' : null,
    active: true,
    hapticPlayed: false,
  };
}

// ─── Entity Update ──────────────────────────────────────────

export function updateEntity(
  entity: Entity,
  isFocused: boolean,
  dt: number,
  state: GameState,
): Entity {
  const updated = { ...entity };
  const speed = state.difficulty;

  if (isFocused) {
    updated.focusTime += dt;
    updated.ignoreTime = 0;
    updated.visibility = Math.min(1, updated.visibility + dt * 0.3 * speed);

    if (updated.visibility >= 0.9) {
      updated.dangerous = true;
      updated.deathType = 'looked';
    }
  } else {
    updated.ignoreTime += dt;
    updated.focusTime = 0;

    if (updated.visibility > 0 && updated.ignoreTime > 2) {
      updated.visibility = Math.max(0, updated.visibility - dt * 0.1);
    }

    if (updated.ignoreTime > 8 && state.hiddenDanger > 50) {
      updated.dangerous = true;
      updated.deathType = 'ignored';
      updated.visibility = Math.min(0.3, updated.visibility + dt * 0.05);
    }
  }

  // Flashlight reveals all
  if (state.flashlightActive) {
    updated.visibility = Math.min(1, updated.visibility + dt * 2);
  }

  if (updated.visibility <= 0 && updated.ignoreTime > 10) {
    updated.active = false;
  }

  return updated;
}

// ─── Death Check ────────────────────────────────────────────

export function checkDeath(state: GameState): DeathCause {
  // Sanity death
  if (state.sanity <= 0) return 'insanity';

  for (const entity of state.entities) {
    if (entity.dangerous && entity.visibility >= 1 && entity.focusTime > 3) {
      return 'looked';
    }
    if (entity.dangerous && entity.ignoreTime > 12 && state.hiddenDanger > 70) {
      return 'ignored';
    }
  }

  return null;
}

// ─── Room Progression ───────────────────────────────────────

export function shouldAdvanceRoom(state: GameState): boolean {
  // Advance every 30 seconds of survival (scales with difficulty)
  const threshold = 30 / state.difficulty;
  return state.timeAlive > 0 && state.timeAlive % threshold < 0.1;
}

export function getDifficulty(roomIndex: number): number {
  return 1 + roomIndex * 0.15; // 15% harder per room
}
