export function assertSeed(seed: number): void {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) {
    throw new Error('Mission seed must be an unsigned 32-bit integer');
  }
}

/** Key-order independent JSON, so regenerated and stored missions compare reliably. */
export function canonical(value: unknown): string {
  return JSON.stringify(value, (_key, item: unknown) =>
    item && typeof item === 'object' && !Array.isArray(item)
      ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)))
      : item
  );
}

export function isInt(value: unknown, min: number, max: number): value is number {
  return Number.isInteger(value) && (value as number) >= min && (value as number) <= max;
}

/** Reviewed given names shared by the story families. */
export const STORY_NAMES = ['Hải', 'Bình', 'An', 'Lan', 'Mai', 'Nam', 'Hà', 'Minh'] as const;

/** Deterministic Fisher–Yates shuffle driven by a caller-supplied random stream. */
export function shuffleWith<T>(values: T[], rng: () => number): T[] {
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values;
}

/**
 * Four distinct numeric choices: the correct value, then plausible mistakes, then nearby
 * fillers. Unlike the frozen instruction-chain helper, values may reach `max` (answers above 20).
 */
export function boundedNumericChoices(
  correct: number,
  candidates: number[],
  rng: () => number,
  max = 100
): { id: string; label: string; value: number }[] {
  const values = [correct];
  const fillers = [1, -1, 2, -2, 10, -10, 3, -3, 5, -5].map((delta) => correct + delta);
  for (const candidate of [
    ...candidates,
    ...fillers,
    ...Array.from({ length: max + 1 }, (_, i) => i),
  ]) {
    if (isInt(candidate, 0, max) && !values.includes(candidate)) values.push(candidate);
    if (values.length === 4) break;
  }
  return shuffleWith(
    values.map((value) => ({ id: `value_${value}`, label: String(value), value })),
    rng
  );
}
