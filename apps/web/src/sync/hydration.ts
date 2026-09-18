import {
  loadAttempts,
  getAttemptHistoryStorageKey,
  loadAllSessions,
  saveDailySession,
  loadProfile,
  saveProfile,
  createEmptyProfile,
  loadWorldProgression,
  saveActiveArea,
  loadPlayerRewards,
  savePlayerRewards,
  calculateLevel,
  DEFAULT_EQUIPPED,
  getDefaultTomorrowReward,
  getDefaultStorage,
  type Attempt,
  type DailySession,
  type SkillProfile,
  type WorldProgressionState,
  type PlayerRewardsState,
  type SessionStorageAdapter,
  type WorldAreaId,
} from '@math-archer/learning-engine';
import { MathArcherApiClient } from '../api/client';

export interface HydrationResult {
  success: boolean;
  syncedAttempts: number;
  syncedSessions: number;
  totalXp: number;
  activeAreaId: string;
  error?: string;
}

/**
 * Hydrates and reconciles the player's cloud progress with local storage.
 * Performs a two-way merge:
 * 1. Downloads attempts, sessions, skill progress, world progression, and rewards from the server.
 * 2. Merges with any local offline progress (zero data loss).
 * 3. Uploads newer local progress to the cloud if local is ahead.
 */
export async function hydratePlayerProgress(
  playerId: string = 'player-local',
  apiClient: MathArcherApiClient = new MathArcherApiClient(),
  storage: SessionStorageAdapter = getDefaultStorage()
): Promise<HydrationResult> {
  const localAttempts = loadAttempts(playerId, storage);
  const localWorld = loadWorldProgression(playerId, storage);
  const localRewards = loadPlayerRewards(playerId, storage);
  const localSessions = loadAllSessions(playerId, storage);

  try {
    const res = await apiClient.getProgress(playerId);

    // -------------------------------------------------------------
    // 1. RECONCILE ATTEMPTS
    // -------------------------------------------------------------
    const serverAttempts: Attempt[] = res.attempts ?? [];
    const makeKey = (a: Attempt) =>
      `${a.timestamp}_${a.questionId}_${a.left}_${a.operation}_${a.right}_${a.selectedAnswer}`;

    const seen = new Set<string>();
    const mergedAttempts: Attempt[] = [];

    // Add server attempts
    for (const att of serverAttempts) {
      const k = makeKey(att);
      if (!seen.has(k)) {
        seen.add(k);
        mergedAttempts.push(att);
      }
    }

    // Add local attempts that may not be on the server yet
    let localAheadAttempts = false;
    for (const att of localAttempts) {
      const k = makeKey(att);
      if (!seen.has(k)) {
        seen.add(k);
        mergedAttempts.push(att);
        localAheadAttempts = true;
      }
    }

    // Sort chronologically
    mergedAttempts.sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || ''));
    storage.setItem(getAttemptHistoryStorageKey(playerId), JSON.stringify(mergedAttempts));

    // If local had unsynced attempts, send them in a batch to the server
    if (localAheadAttempts) {
      const unsyncedAttempts = localAttempts.filter(
        (localAtt) =>
          !serverAttempts.some(
            (srvAtt) =>
              srvAtt.questionId === localAtt.questionId && srvAtt.timestamp === localAtt.timestamp
          )
      );
      if (unsyncedAttempts.length > 0) {
        apiClient.submitAttemptsBatch(playerId, unsyncedAttempts).catch(() => {});
      }
    }

    // -------------------------------------------------------------
    // 2. RECONCILE DAILY SESSIONS
    // -------------------------------------------------------------
    const serverSessions: DailySession[] = [...(res.sessions ?? [])];
    if (res.currentSession && !serverSessions.some((s) => s.date === res.currentSession!.date)) {
      serverSessions.push(res.currentSession);
    }

    const sessionByDate = new Map<string, DailySession>();
    for (const sess of localSessions) {
      sessionByDate.set(sess.date, sess);
    }

    for (const srvSess of serverSessions) {
      const locSess = sessionByDate.get(srvSess.date);
      if (!locSess || srvSess.arrowsUsed >= locSess.arrowsUsed) {
        sessionByDate.set(srvSess.date, srvSess);
      }
    }

    for (const sess of sessionByDate.values()) {
      saveDailySession(sess, storage);
    }

    // -------------------------------------------------------------
    // 3. RECONCILE SKILL PROFILE
    // -------------------------------------------------------------
    const localProfile = loadProfile(playerId, storage) ?? createEmptyProfile(playerId);
    const serverProfile = res.profile;

    if (serverProfile && serverProfile.skills) {
      const mergedProfile: SkillProfile = {
        ...localProfile,
        skills: { ...localProfile.skills },
      };

      for (const [skillKey, srvSkill] of Object.entries(serverProfile.skills)) {
        const locSkill = localProfile.skills[skillKey as keyof typeof localProfile.skills];
        if (!locSkill || srvSkill.attempts >= locSkill.attempts) {
          mergedProfile.skills[skillKey as keyof typeof mergedProfile.skills] = srvSkill;
        }
      }

      saveProfile(mergedProfile, storage);
    }

    // -------------------------------------------------------------
    // 4. RECONCILE WORLD PROGRESSION
    // -------------------------------------------------------------
    let finalWorld: WorldProgressionState = localWorld;
    const serverWorld = res.worldProgression;

    if (serverWorld) {
      const combinedUnlocked = Array.from(
        new Set([...localWorld.unlockedAreaIds, ...serverWorld.unlockedAreaIds])
      ) as WorldAreaId[];
      const completedSessions = Math.max(
        localWorld.completedSessionsCount,
        serverWorld.completedSessionsCount
      );
      const activeArea = (
        combinedUnlocked.includes(serverWorld.activeAreaId)
          ? serverWorld.activeAreaId
          : localWorld.activeAreaId
      ) as WorldAreaId;

      finalWorld = saveActiveArea(playerId, activeArea, storage, completedSessions);

      // If local has more completed sessions or newly unlocked areas than the server, push update
      if (
        localWorld.completedSessionsCount > serverWorld.completedSessionsCount ||
        localWorld.unlockedAreaIds.length > serverWorld.unlockedAreaIds.length
      ) {
        apiClient.updateWorldProgression(finalWorld, playerId).catch(() => {});
      }
    } else if (localWorld.completedSessionsCount > 0 || localWorld.unlockedAreaIds.length > 1) {
      apiClient.updateWorldProgression(localWorld, playerId).catch(() => {});
    }

    // -------------------------------------------------------------
    // 5. RECONCILE PLAYER REWARDS
    // -------------------------------------------------------------
    let finalRewards: PlayerRewardsState = localRewards;
    const serverRewards = res.rewards;

    if (serverRewards) {
      const totalXp = Math.max(localRewards.totalXp, serverRewards.totalXp);
      const levelInfo = calculateLevel(totalXp);
      const currentStreak = Math.max(localRewards.currentStreak, serverRewards.currentStreak);
      const bestStreak = Math.max(localRewards.bestStreak, serverRewards.bestStreak, currentStreak);

      const unlockedCosmetics = Array.from(
        new Set([...localRewards.unlockedCosmeticIds, ...serverRewards.unlockedCosmeticIds])
      );
      const unlockedAchievements = Array.from(
        new Set([...localRewards.unlockedAchievementIds, ...serverRewards.unlockedAchievementIds])
      );
      const achievementProgress = {
        ...localRewards.achievementProgress,
        ...serverRewards.achievementProgress,
      };

      const equipped = {
        ...DEFAULT_EQUIPPED,
        ...localRewards.equippedCosmetics,
        ...serverRewards.equippedCosmetics,
      };

      const mergedRewards: PlayerRewardsState = {
        ...localRewards,
        totalXp,
        level: levelInfo.level,
        currentLevelXp: levelInfo.currentLevelXp,
        nextLevelXp: levelInfo.nextLevelXp,
        levelProgressPct: levelInfo.levelProgressPct,
        levelTitle: levelInfo.title,
        currentStreak,
        bestStreak,
        lastActiveDate: serverRewards.lastActiveDate || localRewards.lastActiveDate,
        unlockedCosmeticIds: unlockedCosmetics,
        equippedCosmetics: equipped,
        unlockedAchievementIds: unlockedAchievements,
        achievementProgress,
        tomorrowReward: getDefaultTomorrowReward(currentStreak),
      };

      savePlayerRewards(mergedRewards, storage);
      finalRewards = mergedRewards;

      if (
        localRewards.totalXp > serverRewards.totalXp ||
        localRewards.unlockedCosmeticIds.length > serverRewards.unlockedCosmeticIds.length
      ) {
        apiClient.updatePlayerRewards(mergedRewards, playerId).catch(() => {});
      }
    } else if (localRewards.totalXp > 0) {
      apiClient.updatePlayerRewards(localRewards, playerId).catch(() => {});
    }

    return {
      success: true,
      syncedAttempts: mergedAttempts.length,
      syncedSessions: sessionByDate.size,
      totalXp: finalRewards.totalXp,
      activeAreaId: finalWorld.activeAreaId,
    };
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : 'Hydration failed';
    return {
      success: false,
      syncedAttempts: localAttempts.length,
      syncedSessions: localSessions.length,
      totalXp: localRewards.totalXp,
      activeAreaId: localWorld.activeAreaId,
      error,
    };
  }
}
