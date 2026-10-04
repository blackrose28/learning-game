export type AnimationSpeed = 'fast' | 'normal' | 'slow';

export const ANIMATION_SPEEDS: Record<
  AnimationSpeed,
  { label: string; flightMs: number; advanceMs: number }
> = {
  fast: { label: 'Fast', flightMs: 250, advanceMs: 750 },
  normal: { label: 'Normal', flightMs: 500, advanceMs: 1400 },
  slow: { label: 'Slow', flightMs: 1000, advanceMs: 2400 },
};

export function isAnimationSpeed(value: unknown): value is AnimationSpeed {
  return value === 'fast' || value === 'normal' || value === 'slow';
}
