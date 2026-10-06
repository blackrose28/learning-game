import {
  awardAttemptRewards,
  getArrowsSinceMissionOffer,
  isAdventureInclusionEnabled,
  shouldOfferAdventureMission,
  type DailySession,
  type ReasoningSettings,
  isCleanMissionCompletion,
  loadPlayerRewards,
  savePlayerRewards,
  spendMissionArrow,
  startDailySession,
  type MissionAttempt,
  type SessionStorageAdapter,
} from '@math-archer/learning-engine';
import type { MathArcherApiClient } from './api/client';
import { getResumableMission, loadMissionWorkspace } from './sync/missions';

export interface AdventureMissionCompletion {
  /** False when this mission had already spent its arrow and earned its reward. */
  charged: boolean;
  xpAwarded: number;
}

/**
 * Spend the one daily arrow and grant the one reward for a completed Adventure mission. Called once
 * per completion but safe to repeat: the daily session remembers which attempts were charged, so a
 * refresh or retry neither costs a second arrow nor pays a second reward. The arrow is charged
 * first so a failure afterwards can only lose a reward, never repeat one.
 */
export function completeAdventureMission(
  attempt: MissionAttempt,
  storage: SessionStorageAdapter,
  api?: Pick<MathArcherApiClient, 'updatePlayerRewards'>
): AdventureMissionCompletion {
  if (attempt.mode !== 'adventure' || !attempt.completedAt) {
    throw new Error('Only a completed Adventure mission spends an arrow');
  }
  const { playerId } = attempt;
  const session = startDailySession({ playerId, storage });
  const spent = spendMissionArrow({
    session,
    attemptId: attempt.id,
    hit: isCleanMissionCompletion(attempt),
    storage,
  });
  if (!spent.charged) return { charged: false, xpAwarded: 0 };
  const current = loadPlayerRewards(playerId, storage);
  // One completion reward, supported completion included. It continues no arithmetic hit streak.
  const reward = awardAttemptRewards(current, { isCorrect: true, consecutiveHits: 0 });
  savePlayerRewards(reward.nextState, storage);
  api?.updatePlayerRewards(reward.nextState, playerId).catch(() => {});
  return { charged: true, xpAwarded: reward.xpAwarded };
}

/**
 * Whether Adventure should offer a reasoning mission now. An interrupted Adventure mission is
 * offered again whenever the parent keeps inclusion on; a new one needs the cadence policy and at
 * least two arrows left, so a mission is never the last arrow of the day.
 */
export function isAdventureMissionDue(
  playerId: string,
  settings: ReasoningSettings,
  session: DailySession,
  storage: SessionStorageAdapter
): boolean {
  if (!isAdventureInclusionEnabled(settings)) return false;
  if (session.status === 'completed' || session.arrowsUsed >= session.arrowsAllowed) return false;
  try {
    // A conflicting history is for the parent to resolve first; never offer into it.
    if (loadMissionWorkspace(playerId, storage).items.some((item) => item.conflict)) return false;
    if (getResumableMission(playerId, storage, 'adventure', settings.enabledFamilies)) return true;
  } catch {
    return false;
  }
  return (
    session.arrowsAllowed - session.arrowsUsed >= 2 &&
    shouldOfferAdventureMission(settings, getArrowsSinceMissionOffer(session))
  );
}
