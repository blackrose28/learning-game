import {
  getAllSkills,
  getDefaultStorage,
  type Skill,
  type SessionStorageAdapter,
} from '@math-archer/learning-engine';

export function loadDisabledSkills(
  playerId: string,
  storage: SessionStorageAdapter = getDefaultStorage()
): Skill[] {
  try {
    const value: unknown = JSON.parse(
      storage.getItem(`math_archer_disabled_skills_${playerId}`) || '[]'
    );
    return Array.isArray(value)
      ? getAllSkills()
          .map((s) => s.id)
          .filter((s) => value.includes(s))
      : [];
  } catch {
    return [];
  }
}

export function saveDisabledSkills(
  playerId: string,
  skills: Skill[],
  storage: SessionStorageAdapter = getDefaultStorage()
): void {
  storage.setItem(`math_archer_disabled_skills_${playerId}`, JSON.stringify(skills));
}

export function enabledSkills(disabled: readonly Skill[]): Skill[] {
  const all = getAllSkills().map((s) => s.id);
  const enabled = all.filter((s) => !disabled.includes(s));
  return enabled.length ? enabled : all;
}
