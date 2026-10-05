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
  getWorldActiveAreaKey,
  loadPlayerRewards,
  savePlayerRewards,
  getRewardsStorageKey,
  calculateLevel,
  DEFAULT_EQUIPPED,
  getDefaultTomorrowReward,
  getDefaultStorage,
  type Attempt,
  type DailySession,
  type SkillProfile,
  type WorldProgressionState,
  type PlayerRewardsState,
  type EquippedCosmetics,
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

      const hasLocalActiveAreaInStorage = Boolean(storage.getItem(getWorldActiveAreaKey(playerId)));
      const localTime = localWorld.updatedAt ? new Date(localWorld.updatedAt).getTime() : 0;
      const serverTime = serverWorld.updatedAt ? new Date(serverWorld.updatedAt).getTime() : 0;

      let activeArea: WorldAreaId = 'castle';
      let finalUpdatedAt: string | undefined = undefined;
      let shouldPushWorld = false;

      if (!hasLocalActiveAreaInStorage) {
        // Fresh device or empty local storage — adopt server selection
        activeArea = combinedUnlocked.includes(serverWorld.activeAreaId)
          ? serverWorld.activeAreaId
          : 'castle';
        finalUpdatedAt = serverWorld.updatedAt;
      } else if (serverTime > localTime) {
        // Server was updated more recently on another device
        activeArea = combinedUnlocked.includes(serverWorld.activeAreaId)
          ? serverWorld.activeAreaId
          : combinedUnlocked.includes(localWorld.activeAreaId)
            ? localWorld.activeAreaId
            : 'castle';
        finalUpdatedAt = serverWorld.updatedAt;
      } else if (localTime > serverTime) {
        // Local was updated more recently on this device
        activeArea = combinedUnlocked.includes(localWorld.activeAreaId)
          ? localWorld.activeAreaId
          : combinedUnlocked.includes(serverWorld.activeAreaId)
            ? serverWorld.activeAreaId
            : 'castle';
        finalUpdatedAt = localWorld.updatedAt;
        shouldPushWorld = true;
      } else {
        // Timestamps equal or missing (legacy / initial):
        // If local has chosen a non-castle unlocked realm while server is still default castle, preserve local
        if (
          localWorld.activeAreaId !== 'castle' &&
          combinedUnlocked.includes(localWorld.activeAreaId) &&
          serverWorld.activeAreaId === 'castle'
        ) {
          activeArea = localWorld.activeAreaId;
          finalUpdatedAt = localWorld.updatedAt;
          shouldPushWorld = true;
        } else if (combinedUnlocked.includes(serverWorld.activeAreaId)) {
          activeArea = serverWorld.activeAreaId;
          finalUpdatedAt = serverWorld.updatedAt ?? localWorld.updatedAt;
        } else if (combinedUnlocked.includes(localWorld.activeAreaId)) {
          activeArea = localWorld.activeAreaId;
          finalUpdatedAt = localWorld.updatedAt;
          shouldPushWorld = true;
        } else {
          activeArea = 'castle';
        }
      }

      finalWorld = saveActiveArea(playerId, activeArea, storage, completedSessions, finalUpdatedAt);

      // If local has more completed sessions, newly unlocked areas, or newer realm selection, push update
      if (
        shouldPushWorld ||
        localWorld.completedSessionsCount > serverWorld.completedSessionsCount ||
        localWorld.unlockedAreaIds.length > serverWorld.unlockedAreaIds.length ||
        finalWorld.activeAreaId !== serverWorld.activeAreaId
      ) {
        apiClient.updateWorldProgression(finalWorld, playerId).catch(() => {});
      }
    } else if (
      localWorld.completedSessionsCount > 0 ||
      localWorld.unlockedAreaIds.length > 1 ||
      localWorld.activeAreaId !== 'castle'
    ) {
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
        new Set([
          ...(localRewards.unlockedCosmeticIds ?? []),
          ...(serverRewards.unlockedCosmeticIds ?? []),
        ])
      );
      const unlockedAchievements = Array.from(
        new Set([
          ...(localRewards.unlockedAchievementIds ?? []),
          ...(serverRewards.unlockedAchievementIds ?? []),
        ])
      );
      const achievementProgress = {
        ...(localRewards.achievementProgress ?? {}),
        ...(serverRewards.achievementProgress ?? {}),
      };

      // Reconcile equipped cosmetics:
      const hasLocalRewardsInStorage = Boolean(storage.getItem(getRewardsStorageKey(playerId)));
      const localTime = localRewards.updatedAt ? new Date(localRewards.updatedAt).getTime() : 0;
      const serverTime = serverRewards.updatedAt ? new Date(serverRewards.updatedAt).getTime() : 0;

      let equipped: EquippedCosmetics = { ...DEFAULT_EQUIPPED };
      let shouldPushEquipped = false;

      if (!hasLocalRewardsInStorage) {
        // Fresh device or empty local storage — server is the source of truth!
        equipped = {
          ...DEFAULT_EQUIPPED,
          ...serverRewards.equippedCosmetics,
        };
      } else if (localTime > serverTime) {
        // Local was modified more recently than server (e.g. user equipped robe locally)
        equipped = {
          ...DEFAULT_EQUIPPED,
          ...serverRewards.equippedCosmetics,
          ...localRewards.equippedCosmetics,
        };
        shouldPushEquipped = true;
      } else if (serverTime > localTime) {
        // Server was modified more recently on another device (e.g. Browser B pulling Browser A's robe)
        equipped = {
          ...DEFAULT_EQUIPPED,
          ...localRewards.equippedCosmetics,
          ...serverRewards.equippedCosmetics,
        };
      } else {
        // Timestamps equal or missing (initial/legacy):
        // If local has non-default equipped item while server has default, preserve local!
        equipped = { ...DEFAULT_EQUIPPED };
        const keys: (keyof EquippedCosmetics)[] = [
          'outfit',
          'bow',
          'arrowEffect',
          'castleBanner',
          'castleStatue',
          'castleGround',
          'character',
          'target',
        ];
        const equippedRecord = equipped as unknown as Record<string, string | undefined>;
        for (const k of keys) {
          const loc = localRewards.equippedCosmetics?.[k];
          const srv = serverRewards.equippedCosmetics?.[k];
          const def = DEFAULT_EQUIPPED[k];
          if (loc && loc !== def && (!srv || srv === def)) {
            equippedRecord[k] = loc;
            shouldPushEquipped = true;
          } else if (srv) {
            equippedRecord[k] = srv;
          } else if (loc) {
            equippedRecord[k] = loc;
          }
        }
      }

      // Check if equipped items differ between merged and server:
      const equippedDiffers = (Object.keys(equipped) as (keyof EquippedCosmetics)[]).some(
        (k) => equipped[k] !== serverRewards.equippedCosmetics?.[k]
      );

      if (equippedDiffers) {
        shouldPushEquipped = true;
      }

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
        updatedAt:
          localTime > serverTime
            ? localRewards.updatedAt
            : serverRewards.updatedAt || localRewards.updatedAt || new Date().toISOString(),
      };

      savePlayerRewards(mergedRewards, storage);
      finalRewards = mergedRewards;

      if (
        localRewards.totalXp > serverRewards.totalXp ||
        localRewards.unlockedCosmeticIds.length > serverRewards.unlockedCosmeticIds.length ||
        shouldPushEquipped
      ) {
        apiClient.updatePlayerRewards(mergedRewards, playerId).catch(() => {});
      }
    } else if (localRewards.totalXp > 0 || localRewards.updatedAt) {
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
