import {
  getDefaultStorage,
  isAnimationSpeed,
  type AnimationSpeed,
  type SessionStorageAdapter,
} from '@math-archer/learning-engine';

export function loadAnimationSpeed(
  playerId: string,
  storage: SessionStorageAdapter = getDefaultStorage()
): AnimationSpeed {
  const value = storage.getItem(`math_archer_animation_speed_${playerId}`);
  return isAnimationSpeed(value) ? value : 'fast';
}

export function saveAnimationSpeed(
  playerId: string,
  speed: AnimationSpeed,
  storage: SessionStorageAdapter = getDefaultStorage()
): void {
  storage.setItem(`math_archer_animation_speed_${playerId}`, speed);
}
