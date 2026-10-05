import {
  defaultReasoningSettings,
  getDefaultStorage,
  isReasoningSettings,
  type ReasoningSettings,
  type SessionStorageAdapter,
} from '@math-archer/learning-engine';

export function loadReasoningSettings(
  playerId: string,
  storage: SessionStorageAdapter = getDefaultStorage()
): ReasoningSettings {
  const raw = storage.getItem(`math_archer_reasoning_settings_${playerId}`);
  if (!raw) return defaultReasoningSettings();
  const value: unknown = JSON.parse(raw);
  if (!isReasoningSettings(value)) throw new Error('Unsupported reasoning preferences');
  return value;
}

export function saveReasoningSettings(
  playerId: string,
  settings: ReasoningSettings,
  storage: SessionStorageAdapter = getDefaultStorage()
): void {
  if (!isReasoningSettings(settings)) throw new Error('Invalid reasoning preferences');
  storage.setItem(`math_archer_reasoning_settings_${playerId}`, JSON.stringify(settings));
}
