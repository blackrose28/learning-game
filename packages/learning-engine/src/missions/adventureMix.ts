import { recommendFocus, recommendSupport, type SupportRecommendation } from './adaptive';
import { computeReasoningProgress, type ReasoningSettings } from './progress';
import type { MissionAttempt, MissionFamily } from './types';

/** Initial default to evaluate, not a quota: at most one mission per five Adventure arrows. */
export const ADVENTURE_MISSION_INTERVAL = 5;

export function isAdventureInclusionEnabled(settings: ReasoningSettings): boolean {
  return settings.adventureEnabled === true && settings.enabledFamilies.length > 0;
}

/**
 * Whether the next Adventure slot may be a reasoning mission. Disabled families never enter
 * selection, so with none enabled the arithmetic experience is unchanged. Training is unaffected.
 */
export function shouldOfferAdventureMission(
  settings: ReasoningSettings,
  arrowsSinceLastMission: number
): boolean {
  return (
    isAdventureInclusionEnabled(settings) && arrowsSinceLastMission >= ADVENTURE_MISSION_INTERVAL
  );
}

export interface AdventureMissionChoice {
  family: MissionFamily;
  support: SupportRecommendation;
  /** Why this family: the weakest observed relationship, or the one practised least recently. */
  reason: 'focus' | 'rotation';
}

/**
 * Pick the family and suggested support for an Adventure mission using the same evidence as
 * Training. Only enabled families are considered; null when none is enabled.
 */
export function chooseAdventureMission(
  playerId: string,
  attempts: readonly MissionAttempt[],
  enabledFamilies: readonly MissionFamily[]
): AdventureMissionChoice | null {
  if (!enabledFamilies.length) return null;
  const focus = recommendFocus(computeReasoningProgress(playerId, [...attempts]), enabledFamilies);
  let family: MissionFamily;
  let reason: AdventureMissionChoice['reason'];
  if (focus) {
    family = focus.family;
    reason = 'focus';
  } else {
    // Vary the surface: the family whose latest attempt is oldest (never attempted comes first).
    const latest = (candidate: MissionFamily) =>
      attempts
        .filter((item) => item.mission.family === candidate)
        .reduce((max, item) => (item.startedAt > max ? item.startedAt : max), '');
    family = [...enabledFamilies].sort((a, b) => latest(a).localeCompare(latest(b)))[0];
    reason = 'rotation';
  }
  return { family, support: recommendSupport(attempts, family), reason };
}
