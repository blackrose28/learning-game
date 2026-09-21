import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  type Question,
  type AnswerChoice,
  type ElementType,
  type SkillProfile,
  type Attempt,
  type DailySession,
  type SessionStorageAdapter,
  type Skill,
  type SelectionCategory,
  createEmptyProfile,
  selectNextQuestionWithDistractors,
  recordAttempt,
  formatExpression,
  startDailySession,
  submitAnswer,
  completeSession,
  loadProfile,
  saveProfile,
  getSkillDefinition,
  getRecommendedFocus,
  getWeakSkills,
  SKILL_DEFINITIONS,
  createControlledTestProfile,
  CONTROLLED_TEST_PROFILES,
  type ControlledTestProfileKey,
  isMake10Eligible,
  generateMake10Decomposition,
  type Make10Decomposition,
  type HintLevel,
  generateQuestionHint,
  type QuestionHint,
  saveAttempt,
  type WorldAreaId,
  type WorldArea,
  loadWorldProgression,
  saveActiveArea,
  getWorldArea,
  checkNewAreaUnlocked,
  getCompletedSessionsCount,
  type PlayerRewardsState,
  type CharacterType,
  type TargetType,
  loadPlayerRewards,
  savePlayerRewards,
  awardAttemptRewards,
  awardSessionCompleteRewards,
  switchCharacter,
  switchTarget,
} from '@math-archer/learning-engine';
import './GameScreen.css';
import { SyncManager, type SyncState } from '../sync';
import { CharacterGraphic } from './CharacterGraphic';
import { TargetGraphic } from './TargetGraphic';
import { ElementalArrowGraphic, ELEMENTAL_PROFILES } from './ElementalArrowGraphic';
import { RangeBackdrop } from './RangeBackdrop';
import { WorldMap } from './WorldMap';
import { audioFx } from '../audio/AudioFx';
import { useGamepad, XboxButton } from '../input/useGamepad';
import { useSafeAuth } from '../context/AuthContext';

export type GameMode = 'adventure' | 'training' | 'challenge';

export interface GameScreenProps {
  /**
   * Optional initial question to display (useful for deterministic tests or presets).
   */
  initialQuestion?: Question;

  /**
   * Current game mode (defaults to 'adventure').
   * - 'adventure': 50 daily arrows, progressive hints starting at strategy hint
   * - 'training': unlimited practice, complete worked example explanations readily available
   * - 'challenge': faster paced, no hints
   */
  mode?: GameMode;

  /**
   * Optional initial skill profile to load (useful for testing adaptation with controlled profiles).
   */
  initialProfile?: SkillProfile;

  /**
   * Maximum arrows in a daily session (defaults to 50 as defined in plan).
   */
  maxArrows?: number;

  /**
   * Delay in milliseconds before advancing to the next question after an answer is chosen.
   * Defaults to 750ms. Set to 0 in tests for synchronous transitions.
   */
  autoAdvanceDelayMs?: number;

  /**
   * Initial arrow index (1-based). Defaults to 1.
   */
  initialArrowIndex?: number;

  /**
   * Optional flight duration in milliseconds for the arrow projectile.
   * If omitted, defaults to min(250, autoAdvanceDelayMs * 0.35).
   */
  shotFlightDurationMs?: number;

  /**
   * Optional storage adapter to persist daily session and skill profile data (e.g. for testing).
   */
  storage?: SessionStorageAdapter;

  /**
   * Optional date string for the daily session ('YYYY-MM-DD'). Defaults to local today.
   */
  sessionDate?: string;

  /**
   * Optional player identifier. Defaults to 'player-local'.
   */
  playerId?: string;

  /**
   * Whether to allow resetting and starting a fresh session on the same calendar day (defaults to false).
   */
  allowSameDayRestart?: boolean;

  /**
   * Whether to display the test profile switcher bar.
   * Only displayed in development mode (import.meta.env.DEV) and hidden in production.
   */
  showProfileSelector?: boolean;

  /**
   * Optional callback fired when child selects an answer.
   */
  onAnswerSubmit?: (choice: AnswerChoice, isCorrect: boolean) => void;

  /**
   * Optional callback fired when the next question is loaded.
   */
  onNextQuestion?: (nextQuestion: Question) => void;

  /**
   * Optional callback fired when session completes (all arrows used).
   */
  onSessionComplete?: (stats: { hits: number; total: number }) => void;

  /**
   * Optional callback fired when the skill profile updates.
   */
  onProfileChange?: (profile: SkillProfile) => void;

  /**
   * Optional callback fired when game mode changes.
   */
  onModeChange?: (mode: GameMode) => void;

  /**
   * Optional initial deliberate practice skill focus for training mode (defaults to 'all').
   */
  initialTrainingSkill?: Skill | 'all';

  /**
   * Optional callback fired when deliberate practice skill changes.
   */
  onTrainingSkillChange?: (skill: Skill | 'all') => void;

  /**
   * Optional callback fired when an attempt is saved to attempt history.
   */
  onAttemptSaved?: (attempt: Attempt) => void;

  /**
   * Optional custom sync manager instance for cloud synchronization.
   */
  syncManager?: SyncManager;

  /**
   * Optional initial active world area ID (defaults to loaded active area or 'castle').
   */
  initialAreaId?: WorldAreaId;

  /**
   * Optional callback fired when the active world area changes.
   */
  onAreaChange?: (areaId: WorldAreaId) => void;
}

export const ELEMENT_INFO: Record<ElementType, { icon: string; label: string }> = {
  fire: { icon: '🔥', label: 'Fire' },
  ice: { icon: '❄️', label: 'Ice' },
  wind: { icon: '💨', label: 'Wind' },
  earth: { icon: '🪨', label: 'Earth' },
};

export type ShotPhase = 'idle' | 'shooting' | 'impact';
export type ArcherState = 'idle' | 'drawing' | 'released';
export type TargetHitState = 'idle' | 'hit' | 'miss';

export interface ActiveShot {
  element: ElementType;
  value: number;
  outcome: 'hit' | 'miss';
}

function getCategoryInfo(category?: SelectionCategory): { label: string; className: string } {
  switch (category) {
    case 'weak':
      return { label: '⚠️ Needs Practice (Weak Focus)', className: 'category-weak' };
    case 'developing':
      return { label: '🌱 Developing Skill', className: 'category-developing' };
    case 'mastered':
      return { label: '⭐ Review (Mastered)', className: 'category-mastered' };
    case 'challenge':
      return { label: '🔥 Challenge Frontier', className: 'category-challenge' };
    default:
      return { label: '🎯 Adaptive Practice', className: 'category-default' };
  }
}

export const GameScreen: React.FC<GameScreenProps> = ({
  initialQuestion,
  mode = 'adventure',
  initialProfile,
  maxArrows = 50,
  autoAdvanceDelayMs = 750,
  initialArrowIndex = 1,
  shotFlightDurationMs,
  storage,
  sessionDate,
  playerId = 'player-local',
  allowSameDayRestart = false,
  showProfileSelector = Boolean(import.meta.env?.DEV),
  initialTrainingSkill,
  onAnswerSubmit,
  onNextQuestion,
  onSessionComplete,
  onProfileChange,
  onModeChange,
  onTrainingSkillChange,
  onAttemptSaved,
  syncManager,
  initialAreaId,
  onAreaChange,
}) => {
  // Test Controlled Profile switcher toolbar must be hidden in production and only show in dev
  const isDev = Boolean(import.meta.env?.DEV);
  const shouldShowProfileSelector = isDev && showProfileSelector;

  // Game mode (Adventure vs Training, Task 4.2 & Task 4.3)
  const [gameMode, setGameMode] = useState<GameMode>(mode);
  const auth = useSafeAuth();

  // World Progression & Active Realm State (Task 9.3)
  const [worldProgression, setWorldProgression] = useState(() =>
    loadWorldProgression(playerId, storage)
  );
  const [activeAreaId, setActiveAreaId] = useState<WorldAreaId>(() => {
    const loaded = loadWorldProgression(playerId, storage);
    if (initialAreaId && loaded.unlockedAreaIds.includes(initialAreaId)) {
      return initialAreaId;
    }
    return loaded.activeAreaId;
  });
  const [newlyUnlockedArea, setNewlyUnlockedArea] = useState<WorldArea | null>(null);
  const [isWorldMapOpen, setIsWorldMapOpen] = useState<boolean>(false);

  const handleSelectArea = (areaId: WorldAreaId) => {
    if (!worldProgression.unlockedAreaIds.includes(areaId)) return;
    setActiveAreaId(areaId);
    const updated = saveActiveArea(
      playerId,
      areaId,
      storage,
      worldProgression.completedSessionsCount
    );
    setWorldProgression(updated);
    onAreaChange?.(areaId);
    setIsWorldMapOpen(false);
    auth?.apiClient.updateWorldProgression(updated, playerId).catch(() => {});
  };

  // Player Rewards & Cosmetic State (Task 9.4)
  const [playerRewards, setPlayerRewards] = useState<PlayerRewardsState>(() =>
    loadPlayerRewards(playerId, storage)
  );
  const playerRewardsRef = useRef<PlayerRewardsState>(playerRewards);
  playerRewardsRef.current = playerRewards;

  const activeCharacter: CharacterType =
    playerRewards.equippedCosmetics?.character || 'archer';
  const activeTarget: TargetType =
    playerRewards.equippedCosmetics?.target || 'archery_target';

  const handleSwitchCharacter = (char: CharacterType) => {
    const current = playerRewardsRef.current;
    if (char === current.equippedCosmetics?.character) return;
    const next = switchCharacter(current, char);
    playerRewardsRef.current = next;
    setPlayerRewards(next);
    savePlayerRewards(next, storage);
    auth?.apiClient.updatePlayerRewards(next, playerId).catch(() => {});
    if (char === 'wizard') {
      audioFx.playMagicCast('fire');
    } else {
      audioFx.playBowRelease('fire');
    }
  };

  const handleSwitchTarget = (t: TargetType) => {
    const current = playerRewardsRef.current;
    if (t === current.equippedCosmetics?.target) return;
    const next = switchTarget(current, t);
    playerRewardsRef.current = next;
    setPlayerRewards(next);
    savePlayerRewards(next, storage);
    auth?.apiClient.updatePlayerRewards(next, playerId).catch(() => {});
    if (t === 'dummy') {
      audioFx.playDummyHit('hit', 'fire');
    } else {
      audioFx.playTargetHit('hit', 'fire');
    }
  };

  const [recentFloatingXp, setRecentFloatingXp] = useState<string | null>(null);
  const [rewardToast, setRewardToast] = useState<string | null>(null);
  const [consecutiveHitsCount, setConsecutiveHitsCount] = useState<number>(0);
  const [lastAttemptWasMiss, setLastAttemptWasMiss] = useState<boolean>(false);

  // Cloud Synchronization Manager (Task 6.4)
  const [activeSyncManager] = useState<SyncManager>(() => {
    return (
      syncManager ??
      new SyncManager({
        playerId,
        storage,
        apiClient: auth?.apiClient,
      })
    );
  });
  const [syncState, setSyncState] = useState<SyncState>(() => activeSyncManager.getState());

  useEffect(() => {
    const unsubscribe = activeSyncManager.subscribe((state) => {
      setSyncState(state);
    });
    return unsubscribe;
  }, [activeSyncManager]);

  // Deliberate training skill focus and session stats (Task 4.3)
  const [selectedTrainingSkill, setSelectedTrainingSkill] = useState<Skill | 'all'>(() => {
    return initialTrainingSkill ?? 'all';
  });
  const [trainingCount, setTrainingCount] = useState<number>(0);
  const [trainingHits, setTrainingHits] = useState<number>(0);

  // Initialize or restore today's daily session
  const [session, setSession] = useState<DailySession>(() => {
    return startDailySession({
      playerId,
      date: sessionDate,
      arrowsAllowed: maxArrows,
      storage,
    });
  });

  // Initialize or restore skill profile
  const [profile, setProfile] = useState<SkillProfile>(() => {
    if (initialProfile) return initialProfile;
    return loadProfile(playerId, storage) ?? createEmptyProfile(playerId);
  });

  const [activePreset, setActivePreset] = useState<ControlledTestProfileKey | 'custom'>(() => {
    if (initialProfile) return 'custom';
    return 'fresh_beginner';
  });

  // Initial question generated from the skill profile (or preset initialQuestion for specific tests)
  const [question, setQuestion] = useState<Question>(() => {
    if (initialQuestion) return initialQuestion;
    const initialProf =
      initialProfile ?? loadProfile(playerId, storage) ?? createEmptyProfile(playerId);
    const allowedSkills =
      mode === 'training' && initialTrainingSkill && initialTrainingSkill !== 'all'
        ? [initialTrainingSkill]
        : getRecommendedFocus(initialProf);
    return selectNextQuestionWithDistractors(initialProf, {
      allowedSkills: allowedSkills.length > 0 ? allowedSkills : undefined,
    });
  });

  // Recent skills history for anti-hammering safeguard (Task 1.6 & Task 3.4)
  const [recentSkills, setRecentSkills] = useState<Skill[]>(() => [question.skill]);

  // Calculate starting arrow index based on persisted session or initialArrowIndex prop
  const [arrowIndex, setArrowIndex] = useState<number>(() => {
    if (initialArrowIndex > 1) {
      return initialArrowIndex;
    }
    return Math.min(maxArrows, session.arrowsUsed + 1);
  });

  const [selectedChoice, setSelectedChoice] = useState<AnswerChoice | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(() => {
    return (
      mode !== 'training' && (session.status === 'completed' || session.arrowsUsed >= maxArrows)
    );
  });

  useEffect(() => {
    setGameMode(mode);
    if (mode === 'training') {
      setActiveHintLevel('full_explanation');
      setIsCompleted(false);
    } else if (session.status === 'completed' || session.arrowsUsed >= maxArrows) {
      setIsCompleted(true);
    }
  }, [mode, session.status, session.arrowsUsed, maxArrows]);

  const [stats, setStats] = useState(() => ({
    hits: session.hits,
    total: session.arrowsUsed,
  }));
  const [restartMessage, setRestartMessage] = useState<string | null>(null);

  // Shooting interaction states (Task 3.2)
  const [shotPhase, setShotPhase] = useState<ShotPhase>('idle');
  const [archerState, setArcherState] = useState<ArcherState>('idle');
  const [targetHitState, setTargetHitState] = useState<TargetHitState>('idle');
  const [activeShot, setActiveShot] = useState<ActiveShot | null>(null);

  // Controller focus states (Task 10.2)
  const [focusedChoiceElement, setFocusedChoiceElement] = useState<ElementType | null>(null);
  const [completionFocusIndex, setCompletionFocusIndex] = useState<number>(0);

  // Progressive Hint Levels (Task 4.2)
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const [activeHintLevel, setActiveHintLevel] = useState<HintLevel>(() =>
    mode === 'training' ? 'full_explanation' : 'strategy_hint'
  );
  const [highestHintLevelUsed, setHighestHintLevelUsed] = useState<HintLevel>('none');

  const updateHighestHintLevel = useCallback((level: HintLevel) => {
    setHighestHintLevelUsed((prev) => {
      const order: HintLevel[] = [
        'none',
        'strategy_hint',
        'partial_decomposition',
        'full_explanation',
      ];
      return order.indexOf(level) > order.indexOf(prev) ? level : prev;
    });
  }, []);

  // Weak skills detected in player profile for deliberate practice (Task 4.3)
  const weakSkills = React.useMemo(() => getWeakSkills(profile), [profile]);

  const isHelpAvailable = isMake10Eligible(question);
  const make10Decomposition: Make10Decomposition | null = React.useMemo(() => {
    if (!isHelpAvailable) return null;
    try {
      return generateMake10Decomposition(question);
    } catch {
      return null;
    }
  }, [question, isHelpAvailable]);

  const questionHint: QuestionHint = React.useMemo(() => {
    return generateQuestionHint(question, activeHintLevel);
  }, [question, activeHintLevel]);

  const handleRequestHelp = useCallback(
    (level?: HintLevel) => {
      if (isTransitioning || (isCompleted && gameMode !== 'training')) return;
      const targetLevel = level ?? (gameMode === 'training' ? 'full_explanation' : 'strategy_hint');
      setActiveHintLevel(targetLevel);
      updateHighestHintLevel(targetLevel);
      setIsHelpOpen(true);
    },
    [isTransitioning, isCompleted, gameMode, updateHighestHintLevel]
  );

  const handleCloseHelp = useCallback(() => {
    setIsHelpOpen(false);
  }, []);

  const handleModeChange = useCallback(
    (newMode: GameMode) => {
      setGameMode(newMode);
      onModeChange?.(newMode);
      if (newMode === 'training') {
        setActiveHintLevel('full_explanation');
        setIsCompleted(false);
        if (selectedTrainingSkill !== 'all') {
          const nextQ = selectNextQuestionWithDistractors(profile, {
            allowedSkills: [selectedTrainingSkill],
            recentSkills: [],
          });
          setQuestion(nextQ);
          setRecentSkills([nextQ.skill]);
        }
      } else {
        setActiveHintLevel('strategy_hint');
        if (session.status === 'completed' || session.arrowsUsed >= maxArrows) {
          setIsCompleted(true);
        }
      }
    },
    [onModeChange, selectedTrainingSkill, profile, session.status, session.arrowsUsed, maxArrows]
  );

  const handleSelectTrainingSkill = useCallback(
    (skill: Skill | 'all') => {
      if (isTransitioning) return;
      setSelectedTrainingSkill(skill);
      onTrainingSkillChange?.(skill);

      const allowedSkills = skill === 'all' ? undefined : [skill];
      const nextQ = selectNextQuestionWithDistractors(profile, {
        allowedSkills,
        recentSkills: [],
      });
      setQuestion(nextQ);
      setRecentSkills([nextQ.skill]);
      setSelectedChoice(null);
      setIsCorrect(null);
      setIsHelpOpen(false);
      setHighestHintLevelUsed('none');
      setActiveHintLevel(gameMode === 'training' ? 'full_explanation' : 'strategy_hint');
      setShotPhase('idle');
      setArcherState('idle');
      setTargetHitState('idle');
      setActiveShot(null);
      questionStartTimeRef.current = Date.now();
      onNextQuestion?.(nextQ);
    },
    [isTransitioning, profile, gameMode, onTrainingSkillChange, onNextQuestion]
  );

  const questionStartTimeRef = useRef<number>(Date.now());
  const flightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up any pending timers on unmount
  useEffect(() => {
    return () => {
      if (flightTimerRef.current) {
        clearTimeout(flightTimerRef.current);
      }
      if (advanceTimerRef.current) {
        clearTimeout(advanceTimerRef.current);
      }
    };
  }, []);

  /**
   * Loads a controlled test profile preset and visibly adapts the game immediately (Task 3.4).
   */
  const handleLoadControlledProfile = useCallback(
    (presetKey: ControlledTestProfileKey) => {
      if (isTransitioning) return;
      const controlled = createControlledTestProfile(presetKey, playerId);
      setProfile(controlled);
      setActivePreset(presetKey);
      saveProfile(controlled, storage);
      onProfileChange?.(controlled);

      const preset = CONTROLLED_TEST_PROFILES[presetKey];
      const targetSkills =
        gameMode === 'training' && selectedTrainingSkill !== 'all'
          ? [selectedTrainingSkill]
          : preset.targetSkill
            ? [preset.targetSkill]
            : getRecommendedFocus(controlled);

      const nextQ = selectNextQuestionWithDistractors(controlled, {
        allowedSkills: targetSkills.length > 0 ? targetSkills : undefined,
        recentSkills: [],
      });
      setQuestion(nextQ);
      setRecentSkills([nextQ.skill]);
      setSelectedChoice(null);
      setIsCorrect(null);
      setIsHelpOpen(false);
      setHighestHintLevelUsed('none');
      setActiveHintLevel(gameMode === 'training' ? 'full_explanation' : 'strategy_hint');
      setShotPhase('idle');
      setArcherState('idle');
      setTargetHitState('idle');
      setActiveShot(null);
      questionStartTimeRef.current = Date.now();
      onNextQuestion?.(nextQ);
    },
    [
      isTransitioning,
      playerId,
      storage,
      onProfileChange,
      onNextQuestion,
      gameMode,
      selectedTrainingSkill,
    ]
  );

  const handleSelectChoice = useCallback(
    (choice: AnswerChoice) => {
      if (isTransitioning || (isCompleted && gameMode !== 'training')) return;

      const correct = choice.category === 'correct' || choice.value === question.answer;
      const outcome: 'hit' | 'miss' = correct ? 'hit' : 'miss';
      const responseTimeMs = Math.max(50, Date.now() - questionStartTimeRef.current);

      setSelectedChoice(choice);
      setIsCorrect(correct);
      setIsTransitioning(true);

      // Phase 1 & 2: Arrow selected -> archer shoots!
      setShotPhase('shooting');
      setArcherState('released');
      setActiveShot({
        element: choice.element,
        value: choice.value,
        outcome,
      });

      const currentRewards = playerRewardsRef.current;
      const currentChar = currentRewards.equippedCosmetics?.character || 'archer';
      const currentTarget = currentRewards.equippedCosmetics?.target || 'archery_target';

      // Procedural audio effects (Task 9.1 & 9.2)
      if (currentChar === 'wizard') {
        audioFx.playMagicCast(choice.element);
      } else {
        audioFx.playBowRelease(choice.element);
      }
      audioFx.playArrowFlight(choice.element);

      const attempt: Attempt = {
        questionId: question.id,
        operation: question.operation,
        left: question.left,
        right: question.right,
        answer: question.answer,
        selectedAnswer: choice.value,
        correct,
        responseTimeMs,
        skill: question.skill,
        hintUsed: highestHintLevelUsed !== 'none',
        hintLevel: highestHintLevelUsed,
        timestamp: new Date().toISOString(),
        category: choice.category,
        mode: gameMode,
        playerId: profile.playerId,
        sessionId: session.id,
      };

      // Task 5.1: Persist attempt to attempt history in local storage
      saveAttempt(attempt, storage);
      onAttemptSaved?.(attempt);

      // Task 6.4: Cloud Synchronization with offline queue
      activeSyncManager.processAttempt(attempt).catch(() => {});

      // Task 3.4 Learning Engine Loop:
      // SkillProfile -> Question -> child answer -> Attempt -> recordAttempt() -> updated SkillProfile
      const updatedProfile = recordAttempt(profile, attempt);
      setProfile(updatedProfile);
      saveProfile(updatedProfile, storage);
      onProfileChange?.(updatedProfile);

      const updatedRecentSkills = [...recentSkills, question.skill].slice(-5);
      setRecentSkills(updatedRecentSkills);

      let currentSession = session;
      let shouldComplete = false;

      if (gameMode === 'adventure') {
        // Adventure mode consumes daily arrows (Task 3.3)
        const submitRes = submitAnswer({
          session,
          isCorrect: correct,
          attempt,
          storage,
        });
        currentSession = submitRes.session;
        setSession(currentSession);
        shouldComplete =
          submitRes.isCompleted ||
          arrowIndex >= maxArrows ||
          currentSession.arrowsUsed >= maxArrows;

        const newStats = {
          hits: currentSession.hits,
          total: currentSession.arrowsUsed,
        };
        setStats(newStats);
        setArrowIndex(currentSession.arrowsUsed + 1);
      } else {
        // Training mode: UNLIMITED questions, 0 daily arrows consumed (Task 4.3)
        setTrainingCount((prev) => prev + 1);
        if (correct) {
          setTrainingHits((prev) => prev + 1);
        }
      }

      onAnswerSubmit?.(choice, correct);

      // Task 9.4 Rewards: Award attempt XP & evaluate achievements
      const isMake10 = isMake10Eligible(question);
      const isDoubles = question.left === question.right && question.operation === 'add';
      const attemptRewards = awardAttemptRewards(currentRewards, {
        isCorrect: correct,
        isMake10,
        isDoubles,
        element: choice.element,
        wasMissPreceding: lastAttemptWasMiss,
        consecutiveHits: correct ? consecutiveHitsCount + 1 : 0,
        completedSessionsCount: worldProgression.completedSessionsCount,
        character: currentChar,
        target: currentTarget,
      });

      playerRewardsRef.current = attemptRewards.nextState;
      setPlayerRewards(attemptRewards.nextState);
      savePlayerRewards(attemptRewards.nextState, storage);
      auth?.apiClient.updatePlayerRewards(attemptRewards.nextState, playerId).catch(() => {});

      if (correct) {
        setConsecutiveHitsCount((prev) => prev + 1);
        setLastAttemptWasMiss(false);
      } else {
        setConsecutiveHitsCount(0);
        setLastAttemptWasMiss(true);
      }

      setRecentFloatingXp(`+${attemptRewards.xpAwarded} XP ⭐`);

      if (attemptRewards.levelUp) {
        setRewardToast(
          `⭐ LEVEL UP! Level ${attemptRewards.levelUp.newLevel}: ${attemptRewards.levelUp.newTitle}!`
        );
      } else if (attemptRewards.newAchievements.length > 0) {
        const ach = attemptRewards.newAchievements[0];
        setRewardToast(`🏆 Achievement: ${ach.title}! (+${ach.xpReward} XP)`);
      }

      const flightDelay =
        autoAdvanceDelayMs > 0
          ? shotFlightDurationMs !== undefined
            ? shotFlightDurationMs
            : Math.min(250, Math.max(50, Math.floor(autoAdvanceDelayMs * 0.35)))
          : 0;

      const advance = () => {
        if (gameMode === 'adventure' && shouldComplete) {
          const prevCompletedCount = worldProgression.completedSessionsCount;
          completeSession(currentSession, { storage });
          const newCompletedCount = getCompletedSessionsCount(playerId, storage);
          const newlyUnlocked = checkNewAreaUnlocked(prevCompletedCount, newCompletedCount);
          if (newlyUnlocked) {
            setNewlyUnlockedArea(newlyUnlocked);
          }
          const updatedProg = loadWorldProgression(playerId, storage, newCompletedCount);
          setWorldProgression(updatedProg);

          // Task 9.4 Rewards: Award session completion bonus, streak advance, & tomorrow's bounty
          const sessionRewards = awardSessionCompleteRewards(attemptRewards.nextState, {
            sessionDate: currentSession.date || new Date().toISOString().slice(0, 10),
            completedSessionsCount: newCompletedCount,
            realmsDiscovered: updatedProg.unlockedAreaIds.length,
            hitsInSession: currentSession.hits,
            totalArrowsInSession: currentSession.arrowsUsed,
          });
          playerRewardsRef.current = sessionRewards.nextState;
          setPlayerRewards(sessionRewards.nextState);
          savePlayerRewards(sessionRewards.nextState, storage);
          auth?.apiClient.updatePlayerRewards(sessionRewards.nextState, playerId).catch(() => {});
          auth?.apiClient.updateWorldProgression(updatedProg, playerId).catch(() => {});

          setIsCompleted(true);
          setIsTransitioning(false);
          setIsHelpOpen(false);
          setHighestHintLevelUsed('none');
          setActiveHintLevel('strategy_hint');
          setShotPhase('idle');
          setArcherState('idle');
          setTargetHitState('idle');
          setActiveShot(null);
          onSessionComplete?.({
            hits: currentSession.hits,
            total: currentSession.arrowsUsed,
          });
        } else {
          // Select next question adaptively using updated profile
          // If a deliberate training skill is selected, restrict allowedSkills to that skill!
          const allowedSkills =
            gameMode === 'training' && selectedTrainingSkill !== 'all'
              ? [selectedTrainingSkill]
              : undefined;

          const nextQ = selectNextQuestionWithDistractors(updatedProfile, {
            allowedSkills,
            recentSkills: selectedTrainingSkill !== 'all' ? [] : updatedRecentSkills,
            previousQuestionId: question.id,
            previousPairKey: `${question.left} ${question.operation === 'add' ? '+' : '-'} ${question.right}`,
          });

          setQuestion(nextQ);
          setSelectedChoice(null);
          setIsCorrect(null);
          setIsTransitioning(false);
          setIsHelpOpen(false);
          setHighestHintLevelUsed('none');
          setActiveHintLevel(gameMode === 'training' ? 'full_explanation' : 'strategy_hint');
          setShotPhase('idle');
          setArcherState('idle');
          setTargetHitState('idle');
          setActiveShot(null);
          questionStartTimeRef.current = Date.now();
          onNextQuestion?.(nextQ);
        }
      };

      const playImpactSound = () => {
        const targetToPlay =
          playerRewardsRef.current.equippedCosmetics?.target || 'archery_target';
        if (targetToPlay === 'dummy') {
          audioFx.playDummyHit(outcome, choice.element);
        } else {
          audioFx.playTargetHit(outcome, choice.element);
        }
      };

      if (autoAdvanceDelayMs > 0) {
        if (flightDelay > 0) {
          flightTimerRef.current = setTimeout(() => {
            // Phase 3 & 4: Arrow hits target -> impact reaction and feedback!
            setShotPhase('impact');
            setTargetHitState(outcome);
            playImpactSound();
          }, flightDelay);
        } else {
          setShotPhase('impact');
          setTargetHitState(outcome);
          playImpactSound();
        }

        // Phase 5: Next question after delay
        advanceTimerRef.current = setTimeout(advance, autoAdvanceDelayMs);
      } else {
        setShotPhase('impact');
        setTargetHitState(outcome);
        playImpactSound();
        advance();
      }
    },
    [
      isTransitioning,
      isCompleted,
      question,
      profile,
      recentSkills,
      session,
      storage,
      maxArrows,
      autoAdvanceDelayMs,
      shotFlightDurationMs,
      onAnswerSubmit,
      onNextQuestion,
      onSessionComplete,
      onProfileChange,
      arrowIndex,
      highestHintLevelUsed,
      gameMode,
      selectedTrainingSkill,
      playerRewards,
      activeCharacter,
      activeTarget,
      worldProgression,
      consecutiveHitsCount,
      lastAttemptWasMiss,
      playerId,
      auth,
    ]
  );

  // Keyboard accessibility (keys 1-4 or F, I, W, E, H for help, Esc to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTransitioning || (isCompleted && gameMode !== 'training')) return;

      const key = e.key.toLowerCase();

      if (isHelpOpen) {
        if (key === 'escape' || key === 'h') {
          setIsHelpOpen(false);
        } else if (key === 'p') {
          setActiveHintLevel('partial_decomposition');
          updateHighestHintLevel('partial_decomposition');
        } else if (key === 'f') {
          setActiveHintLevel('full_explanation');
          updateHighestHintLevel('full_explanation');
        }
        return;
      }

      if (key === 'h' && isHelpAvailable) {
        handleRequestHelp();
        return;
      }

      let selectedIndex = -1;

      if (['1', '2', '3', '4'].includes(key)) {
        selectedIndex = Number.parseInt(key, 10) - 1;
      } else if (key === 'f' || key === 'a') {
        selectedIndex = question.choices.findIndex((c) => c.element === 'fire');
      } else if (key === 'i' || key === 'b') {
        selectedIndex = question.choices.findIndex((c) => c.element === 'ice');
      } else if (key === 'w' || key === 'x') {
        selectedIndex = question.choices.findIndex((c) => c.element === 'wind');
      } else if (key === 'e' || key === 'y') {
        selectedIndex = question.choices.findIndex((c) => c.element === 'earth');
      }

      if (selectedIndex >= 0 && selectedIndex < question.choices.length) {
        handleSelectChoice(question.choices[selectedIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handleSelectChoice,
    handleRequestHelp,
    updateHighestHintLevel,
    isTransitioning,
    isCompleted,
    isHelpOpen,
    isHelpAvailable,
    question.choices,
  ]);

  const handleRestart = () => {
    if (gameMode === 'training') {
      setTrainingCount(0);
      setTrainingHits(0);
      const allowedSkills = selectedTrainingSkill === 'all' ? undefined : [selectedTrainingSkill];
      const nextQ = selectNextQuestionWithDistractors(profile, {
        allowedSkills,
        recentSkills: [],
      });
      setQuestion(nextQ);
      setRecentSkills([nextQ.skill]);
      setSelectedChoice(null);
      setIsCorrect(null);
      setIsTransitioning(false);
      setIsCompleted(false);
      setIsHelpOpen(false);
      setHighestHintLevelUsed('none');
      setActiveHintLevel('full_explanation');
      setRestartMessage(null);
      setShotPhase('idle');
      setArcherState('idle');
      setTargetHitState('idle');
      setActiveShot(null);
      questionStartTimeRef.current = Date.now();
      return;
    }

    if (!allowSameDayRestart) {
      // In normal mode, a second session cannot give another 50 arrows on the same day.
      const current = startDailySession({
        playerId,
        date: sessionDate,
        arrowsAllowed: maxArrows,
        storage,
      });

      if (current.status === 'completed' || current.arrowsUsed >= maxArrows) {
        setRestartMessage('A second session cannot give another 50 arrows on the same day.');
        return;
      }
    }

    const freshSession = startDailySession({
      playerId,
      date: sessionDate,
      arrowsAllowed: maxArrows,
      storage,
      forceNew: true,
    });

    const freshProfile = createEmptyProfile(playerId);
    setProfile(freshProfile);
    saveProfile(freshProfile, storage);
    setActivePreset('fresh_beginner');
    onProfileChange?.(freshProfile);

    setSession(freshSession);
    const nextQ = selectNextQuestionWithDistractors(freshProfile);
    setQuestion(nextQ);
    setRecentSkills([nextQ.skill]);
    setArrowIndex(1);
    setSelectedChoice(null);
    setIsCorrect(null);
    setIsTransitioning(false);
    setIsCompleted(false);
    setIsHelpOpen(false);
    setHighestHintLevelUsed('none');
    setActiveHintLevel('strategy_hint');
    setRestartMessage(null);
    setShotPhase('idle');
    setArcherState('idle');
    setTargetHitState('idle');
    setActiveShot(null);
    setStats({ hits: 0, total: 0 });
    setFocusedChoiceElement(null);
    setCompletionFocusIndex(0);
    questionStartTimeRef.current = Date.now();
  };

  // Total number of completion actions (Task 10.2)
  const getCompletionActionsCount = useCallback(() => {
    return newlyUnlockedArea ? 4 : 3;
  }, [newlyUnlockedArea]);

  const handleExecuteCompletionAction = useCallback(
    (index: number) => {
      if (index === 0) {
        handleModeChange('training');
      } else if (index === 1) {
        handleRestart();
      } else if (index === 2) {
        setIsWorldMapOpen(true);
      } else if (index === 3 && newlyUnlockedArea) {
        handleSelectArea(newlyUnlockedArea.id);
      }
    },
    [handleModeChange, newlyUnlockedArea, handleSelectArea]
  );

  useEffect(() => {
    if (isCompleted) {
      setCompletionFocusIndex(0);
    }
  }, [isCompleted]);

  // Phase 10: Xbox Controller Mapping & Focus Navigation
  useGamepad({
    enabled: true,
    onButtonDown: (btn) => {
      // 1. Session complete screen navigation
      if (isCompleted && gameMode !== 'training') {
        if (btn === XboxButton.A) {
          handleExecuteCompletionAction(completionFocusIndex);
        } else if (btn === XboxButton.B) {
          setIsWorldMapOpen(true);
        }
        return;
      }

      // 2. Help modal navigation
      if (isHelpOpen) {
        if (btn === XboxButton.A) {
          if (activeHintLevel === 'strategy_hint') {
            setActiveHintLevel('partial_decomposition');
            updateHighestHintLevel('partial_decomposition');
          } else if (activeHintLevel === 'partial_decomposition') {
            setActiveHintLevel('full_explanation');
            updateHighestHintLevel('full_explanation');
          }
        } else if (btn === XboxButton.B || btn === XboxButton.View || btn === XboxButton.Menu) {
          setIsHelpOpen(false);
        }
        return;
      }

      // 3. World map modal navigation
      if (isWorldMapOpen) {
        if (btn === XboxButton.B) {
          setIsWorldMapOpen(false);
        }
        return;
      }

      // 4. In active gameplay / question answering (Task 10.1 & 10.2)
      if (isTransitioning) return;

      if (btn === XboxButton.A) {
        // Direct mapping A -> Fire (Task 10.1)
        // If child specifically focused another choice via D-pad, activate that choice
        const targetElement =
          focusedChoiceElement && focusedChoiceElement !== 'fire' ? focusedChoiceElement : 'fire';
        const targetChoice = question.choices.find((c) => c.element === targetElement);
        if (targetChoice) {
          handleSelectChoice(targetChoice);
        }
      } else if (btn === XboxButton.B) {
        // Direct mapping B -> Ice (Task 10.1)
        const iceChoice = question.choices.find((c) => c.element === 'ice');
        if (iceChoice) {
          handleSelectChoice(iceChoice);
        }
      } else if (btn === XboxButton.X) {
        // Direct mapping X -> Wind (Task 10.1)
        const windChoice = question.choices.find((c) => c.element === 'wind');
        if (windChoice) {
          handleSelectChoice(windChoice);
        }
      } else if (btn === XboxButton.Y) {
        // Direct mapping Y -> Earth (Task 10.1)
        const earthChoice = question.choices.find((c) => c.element === 'earth');
        if (earthChoice) {
          handleSelectChoice(earthChoice);
        }
      } else if (btn === XboxButton.LB || btn === XboxButton.RB) {
        // Bumpers switch mode between adventure and training
        handleModeChange(gameMode === 'adventure' ? 'training' : 'adventure');
      } else if (btn === XboxButton.View || btn === XboxButton.Menu) {
        // View/Menu opens help
        if (isHelpAvailable && !isHelpOpen) {
          handleRequestHelp();
        }
      }
    },
    onDirection: (direction) => {
      // 1. Session complete screen navigation
      if (isCompleted && gameMode !== 'training') {
        const count = getCompletionActionsCount();
        if (direction === 'up') {
          setCompletionFocusIndex((prev) => (prev > 0 ? prev - 1 : count - 1));
        } else if (direction === 'down') {
          setCompletionFocusIndex((prev) => (prev < count - 1 ? prev + 1 : 0));
        }
        return;
      }

      // 2. Question arrow choices navigation (2x2 grid)
      if (!isCompleted || gameMode === 'training') {
        setFocusedChoiceElement((current) => {
          const prev = current ?? 'fire';
          if (direction === 'right') {
            if (prev === 'fire') return 'ice';
            if (prev === 'wind') return 'earth';
            if (prev === 'ice') return 'fire';
            if (prev === 'earth') return 'wind';
          } else if (direction === 'left') {
            if (prev === 'ice') return 'fire';
            if (prev === 'earth') return 'wind';
            if (prev === 'fire') return 'ice';
            if (prev === 'wind') return 'earth';
          } else if (direction === 'down') {
            if (prev === 'fire') return 'wind';
            if (prev === 'ice') return 'earth';
            if (prev === 'wind') return 'fire';
            if (prev === 'earth') return 'ice';
          } else if (direction === 'up') {
            if (prev === 'wind') return 'fire';
            if (prev === 'earth') return 'ice';
            if (prev === 'fire') return 'wind';
            if (prev === 'ice') return 'earth';
          }
          return prev;
        });
      }
    },
  });

  if (isWorldMapOpen) {
    return (
      <main className="game-container" role="main">
        <WorldMap
          playerId={playerId}
          storage={storage}
          onSelectArea={handleSelectArea}
          onBackToGame={() => setIsWorldMapOpen(false)}
        />
      </main>
    );
  }

  if (isCompleted && gameMode !== 'training') {
    const currentWorldArea = getWorldArea(activeAreaId);

    return (
      <main className="game-container">
        {/* Game Mode Selector Toolbar */}
        <div className="game-mode-selector-bar" data-testid="mode-selector-bar">
          <span className="game-mode-label">Mode:</span>
          <button
            type="button"
            className="game-mode-tab active"
            data-testid="mode-tab-adventure"
            onClick={() => handleModeChange('adventure')}
          >
            🏹 Adventure
          </button>
          <button
            type="button"
            className="game-mode-tab"
            data-testid="mode-tab-training"
            onClick={() => handleModeChange('training')}
          >
            🏋️ Training
          </button>

          {/* World Realm Badge Button */}
          <button
            type="button"
            className="world-area-badge-btn"
            data-testid="world-area-badge"
            onClick={() => setIsWorldMapOpen(true)}
            title="Open Archery World Map"
          >
            <span className="area-icon">{currentWorldArea.icon}</span>
            <span className="area-name">{currentWorldArea.name}</span>
            <span className="world-shortcut-tag">[🗺️ Map]</span>
          </button>

          {/* Player Level & Streak Badges (Task 9.4) & Cloud Sync Status (Task 6.4) */}
          <div className="game-mode-status-group">
            <span
              className="player-level-badge"
              data-testid="player-level-badge"
              title={`Level ${playerRewards.level}: ${playerRewards.levelTitle}`}
            >
              ⭐ Lvl {playerRewards.level}
            </span>
            <span
              className="streak-badge"
              data-testid="streak-badge"
              title={`Daily Practice Streak: ${playerRewards.currentStreak} Days`}
            >
              🔥 {playerRewards.currentStreak}d
            </span>

            <div
              className="cloud-sync-status-indicator"
              data-testid="cloud-sync-status"
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {syncState.status === 'synced' && (
                <span
                  className="sync-badge sync-synced"
                  title="All attempts synced to cloud"
                  style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}
                >
                  🟢 Synced
                </span>
              )}
              {syncState.status === 'syncing' && (
                <span
                  className="sync-badge sync-syncing"
                  title="Syncing attempts with server"
                  style={{ fontSize: 12, color: '#ca8a04', fontWeight: 600 }}
                >
                  🟡 Syncing{syncState.pendingCount > 0 ? ` (${syncState.pendingCount})` : ''}...
                </span>
              )}
              {syncState.status === 'offline' && (
                <span
                  className="sync-badge sync-offline"
                  title="Working offline; attempts queued securely in local storage"
                  style={{ fontSize: 12, color: '#dc2626', fontWeight: 600 }}
                >
                  🔴 Offline ({syncState.pendingCount} queued)
                </span>
              )}
              {syncState.status === 'error' && (
                <span
                  className="sync-badge sync-error"
                  title={syncState.lastError || 'Sync error'}
                  style={{ fontSize: 12, color: '#ea580c', fontWeight: 600 }}
                >
                  ⚠️ Sync issue ({syncState.pendingCount} pending)
                </span>
              )}
              {syncState.pendingCount > 0 && syncState.status !== 'syncing' && (
                <button
                  type="button"
                  data-testid="sync-now-button"
                  className="sync-now-btn"
                  onClick={() => activeSyncManager.flushQueue()}
                  style={{
                    fontSize: 11,
                    padding: '2px 6px',
                    borderRadius: 4,
                    border: '1px solid #d1d5db',
                    background: '#f9fafb',
                    cursor: 'pointer',
                  }}
                >
                  Sync Now
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="session-complete-card" data-testid="session-complete">
          <span className="archer-icon" role="img" aria-label="target">
            🎯
          </span>
          <h2 className="session-complete-title">Daily Practice Complete!</h2>
          <p className="session-complete-stat">
            You hit <strong>{stats.hits}</strong> out of <strong>{maxArrows}</strong> targets! (
            {Math.round((stats.hits / maxArrows) * 100)}%)
          </p>
          <p
            className="session-complete-notice"
            data-testid="session-complete-notice"
            style={{ color: '#4b5563', fontSize: 14, margin: '8px 0 16px' }}
          >
            All daily arrows used for today. Come back tomorrow for 50 new arrows!
          </p>

          {/* Rewards & Level Progression Summary (Task 9.4) */}
          <div
            className="session-rewards-summary"
            data-testid="session-rewards-summary"
            style={{
              margin: '12px 0',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: 12,
              padding: '12px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              alignItems: 'center',
            }}
          >
            <span style={{ fontWeight: 800, color: '#166534', fontSize: 16 }}>
              ⭐ Session Complete Bonus: +100 XP Earned!
            </span>
            <span style={{ color: '#15803d', fontSize: 14 }}>
              Archer Rank:{' '}
              <strong>
                Level {playerRewards.level} ({playerRewards.levelTitle})
              </strong>{' '}
              • Total XP: {playerRewards.totalXp}
            </span>
            <span style={{ color: '#c2410c', fontWeight: 700, fontSize: 14 }}>
              🔥 Daily Practice Streak: {playerRewards.currentStreak} Day
              {playerRewards.currentStreak === 1 ? '' : 's'}!
            </span>
          </div>

          {/* Tomorrow's Bounty Preview Card - Reason to Return Tomorrow (Task 9.4) */}
          <div
            className="tomorrow-bounty-card"
            data-testid="tomorrow-bounty-card"
            style={{
              margin: '12px 0',
              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
              border: '2px solid #f59e0b',
              borderRadius: 14,
              padding: '14px 18px',
              textAlign: 'left',
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span style={{ fontSize: 24 }}>{playerRewards.tomorrowReward.icon}</span>
              <div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    color: '#b45309',
                    display: 'block',
                  }}
                >
                  🌟 TOMORROW'S BOUNTY • {playerRewards.tomorrowReward.unlockCondition}
                </span>
                <h4 style={{ margin: '2px 0', fontSize: 16, fontWeight: 800, color: '#78350f' }}>
                  {playerRewards.tomorrowReward.title}
                </h4>
              </div>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#92400e', lineHeight: 1.4 }}>
              {playerRewards.tomorrowReward.description}
            </p>
            <p style={{ margin: '6px 0 0', fontSize: 12, fontWeight: 700, color: '#b45309' }}>
              🎯 {playerRewards.tomorrowReward.reasonToReturn}
            </p>
          </div>

          {/* Newly Unlocked World Content Celebration (Task 9.3) */}
          {newlyUnlockedArea && (
            <div
              className={`world-unlock-celebration area-${newlyUnlockedArea.id}`}
              data-testid="world-unlock-celebration"
            >
              <div className="celebration-badge">🎉 NEW REALM UNLOCKED!</div>
              <div className="celebration-title">
                <span>{newlyUnlockedArea.icon}</span> {newlyUnlockedArea.name}
              </div>
              <p className="celebration-desc">{newlyUnlockedArea.description}</p>
              <button
                type="button"
                className={`travel-unlocked-btn ${completionFocusIndex === 3 ? 'controller-focused' : ''}`}
                data-testid="travel-new-realm-btn"
                data-controller-focus={completionFocusIndex === 3 ? 'true' : undefined}
                onClick={() => {
                  handleSelectArea(newlyUnlockedArea.id);
                }}
              >
                🗺️ Travel to {newlyUnlockedArea.name}
                {completionFocusIndex === 3 && (
                  <span className="controller-focus-action-tag"> (A) Select</span>
                )}
              </button>
            </div>
          )}

          {/* World Progress Summary (Task 9.3) */}
          <div className="session-world-progress" data-testid="session-world-progress">
            <span className="world-progress-label">
              🗺️ World Progression: <strong>{worldProgression.unlockedAreaIds.length}</strong> / 5
              Realms Discovered
            </span>
            <button
              type="button"
              className={`open-world-map-btn ${completionFocusIndex === 2 ? 'controller-focused' : ''}`}
              data-testid="session-open-world-map-btn"
              data-controller-focus={completionFocusIndex === 2 ? 'true' : undefined}
              onClick={() => setIsWorldMapOpen(true)}
            >
              🗺️ Open World Map
              {completionFocusIndex === 2 && (
                <span className="controller-focus-action-tag"> (A) Select</span>
              )}
            </button>
          </div>

          <div
            className="session-complete-actions"
            style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}
          >
            <button
              type="button"
              className={`go-to-training-button ${completionFocusIndex === 0 ? 'controller-focused' : ''}`}
              data-testid="go-to-training-button"
              data-controller-focus={completionFocusIndex === 0 ? 'true' : undefined}
              onClick={() => handleModeChange('training')}
            >
              🏋️ Practice Weak Skills in Training Mode (Unlimited)
              {completionFocusIndex === 0 && (
                <span className="controller-focus-action-tag"> (A) Select</span>
              )}
            </button>
            {restartMessage && (
              <p
                className="restart-restriction-message"
                data-testid="restart-restriction-message"
                style={{ color: '#dc2626', fontWeight: 600, fontSize: 14, margin: '0 0 12px' }}
              >
                {restartMessage}
              </p>
            )}
            <button
              className={`restart-button ${completionFocusIndex === 1 ? 'controller-focused' : ''}`}
              onClick={handleRestart}
              data-testid="restart-button"
              data-controller-focus={completionFocusIndex === 1 ? 'true' : undefined}
              disabled={!allowSameDayRestart && session.status === 'completed'}
            >
              {allowSameDayRestart ? '🏹 Practice Again' : '🏹 Daily Practice Finished'}
              {completionFocusIndex === 1 && (
                <span className="controller-focus-action-tag"> (A) Select</span>
              )}
            </button>
          </div>
        </div>
      </main>
    );
  }

  const skillDef = getSkillDefinition(question.skill);
  const skillName = skillDef?.name ?? question.skill;
  const categoryInfo = getCategoryInfo(question.selectionCategory);
  const skillProgress = profile.skills[question.skill];

  return (
    <main className="game-container" role="main">
      {/* Game Mode Selector Toolbar (Task 4.2 & Section 5) */}
      <div className="game-mode-selector-bar" data-testid="mode-selector-bar">
        <span className="game-mode-label">Mode:</span>
        <button
          type="button"
          className={`game-mode-tab ${gameMode === 'adventure' ? 'active' : ''}`}
          data-testid="mode-tab-adventure"
          onClick={() => handleModeChange('adventure')}
        >
          🏹 Adventure
        </button>
        <button
          type="button"
          className={`game-mode-tab ${gameMode === 'training' ? 'active' : ''}`}
          data-testid="mode-tab-training"
          onClick={() => handleModeChange('training')}
        >
          🏋️ Training
        </button>

        {/* World Realm Badge Button (Task 9.3) */}
        <button
          type="button"
          className="world-area-badge-btn"
          data-testid="world-area-badge"
          onClick={() => setIsWorldMapOpen(true)}
          title="Open Archery World Map"
        >
          <span className="area-icon">{getWorldArea(activeAreaId).icon}</span>
          <span className="area-name">{getWorldArea(activeAreaId).name}</span>
          <span className="world-shortcut-tag">[🗺️ Map]</span>
        </button>
        {gameMode === 'training' && (
          <span className="training-mode-banner" data-testid="training-mode-banner">
            🏋️ Training Mode (Unlimited Practice & Explanations · 0 Daily Arrows Used)
          </span>
        )}

        {/* Player Level & Streak Badges (Task 9.4) & Cloud Sync Status (Task 6.4) */}
        <div className="game-mode-status-group">
          <span
            className="player-level-badge"
            data-testid="player-level-badge"
            title={`Level ${playerRewards.level}: ${playerRewards.levelTitle} (${playerRewards.totalXp} XP)`}
          >
            ⭐ Lvl {playerRewards.level}
          </span>
          <span
            className="streak-badge"
            data-testid="streak-badge"
            title={`Daily Practice Streak: ${playerRewards.currentStreak} Days (Best: ${playerRewards.bestStreak})`}
          >
            🔥 {playerRewards.currentStreak}d
          </span>

          <div
            className="cloud-sync-status-indicator"
            data-testid="cloud-sync-status"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {syncState.status === 'synced' && (
              <span
                className="sync-badge sync-synced"
                title="All attempts synced to cloud"
                style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}
              >
                🟢 Synced
              </span>
            )}
            {syncState.status === 'syncing' && (
              <span
                className="sync-badge sync-syncing"
                title="Syncing attempts with server"
                style={{ fontSize: 12, color: '#ca8a04', fontWeight: 600 }}
              >
                🟡 Syncing{syncState.pendingCount > 0 ? ` (${syncState.pendingCount})` : ''}...
              </span>
            )}
            {syncState.status === 'offline' && (
              <span
                className="sync-badge sync-offline"
                title="Working offline; attempts queued securely in local storage"
                style={{ fontSize: 12, color: '#dc2626', fontWeight: 600 }}
              >
                🔴 Offline ({syncState.pendingCount} queued)
              </span>
            )}
            {syncState.status === 'error' && (
              <span
                className="sync-badge sync-error"
                title={syncState.lastError || 'Sync error'}
                style={{ fontSize: 12, color: '#ea580c', fontWeight: 600 }}
              >
                ⚠️ Sync issue ({syncState.pendingCount} pending)
              </span>
            )}
            {syncState.pendingCount > 0 && syncState.status !== 'syncing' && (
              <button
                type="button"
                data-testid="sync-now-button"
                className="sync-now-btn"
                onClick={() => activeSyncManager.flushQueue()}
                style={{
                  fontSize: 11,
                  padding: '2px 6px',
                  borderRadius: 4,
                  border: '1px solid #d1d5db',
                  background: '#f9fafb',
                  cursor: 'pointer',
                }}
              >
                Sync Now
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Real-time Rewards Feedback (Task 9.4) */}
      {recentFloatingXp && (
        <div className="floating-xp-pill" data-testid="floating-xp-pill" aria-live="polite">
          {recentFloatingXp}
        </div>
      )}
      {rewardToast && (
        <div className="reward-toast" data-testid="reward-toast" role="alert">
          {rewardToast}
        </div>
      )}

      {/* Deliberate Practice Bar for Weak Skills in Training Mode (Task 4.3) */}
      {gameMode === 'training' && (
        <div className="deliberate-practice-bar" data-testid="deliberate-practice-bar">
          <div className="deliberate-practice-header">
            <span className="deliberate-practice-title">🎯 Deliberate Practice Focus:</span>
            <span className="deliberate-practice-desc">
              Practice weak skills with unlimited questions and explanations (0 daily arrows used).
            </span>
          </div>

          {weakSkills.length > 0 && (
            <div className="weak-skills-section" data-testid="weak-skills-section">
              <span className="weak-skills-label">⚠️ Detected Weak Skills:</span>
              <div className="weak-skills-chips" data-testid="weak-skills-chips">
                {weakSkills.map((wSkill) => {
                  const def = getSkillDefinition(wSkill);
                  const p = profile.skills[wSkill];
                  const isTargeted = selectedTrainingSkill === wSkill;
                  return (
                    <button
                      key={wSkill}
                      type="button"
                      className={`weak-skill-chip ${isTargeted ? 'active' : ''}`}
                      data-testid={`practice-weak-skill-${wSkill}`}
                      onClick={() => handleSelectTrainingSkill(wSkill)}
                      disabled={isTransitioning}
                    >
                      🎯 {def?.name ?? wSkill} ({Math.round((p?.score ?? 0) * 100)}% score)
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="skill-selector-row">
            <label htmlFor="training-skill-select" className="skill-select-label">
              Focus Skill:
            </label>
            <select
              id="training-skill-select"
              className="training-skill-select"
              data-testid="training-skill-select"
              value={selectedTrainingSkill}
              onChange={(e) => handleSelectTrainingSkill(e.target.value as Skill | 'all')}
              disabled={isTransitioning}
            >
              <option value="all">🎯 All Skills (Adaptive Mix)</option>
              {Object.values(SKILL_DEFINITIONS).map((def) => {
                const p = profile.skills[def.id];
                const isWeakSkill = p && p.attempts > 0 && p.masteryLevel === 'weak';
                return (
                  <option key={def.id} value={def.id}>
                    {isWeakSkill ? '⚠️ ' : ''}
                    {def.name}
                    {p && p.attempts > 0
                      ? ` (${p.masteryLevel}, ${Math.round(p.score * 100)}%)`
                      : ''}
                  </option>
                );
              })}
            </select>

            {selectedTrainingSkill !== 'all' && (
              <span className="active-deliberate-badge" data-testid="active-deliberate-badge">
                Focusing:{' '}
                <strong>
                  {getSkillDefinition(selectedTrainingSkill)?.name ?? selectedTrainingSkill}
                </strong>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Single-Screen Game Arena Layout */}
      <div className="game-arena-layout">
        {/* Left Column: Archery Range & Question Display */}
        <div className="game-range-column">
          {/* Visual Environment Range Backdrop (Task 9.3 & Task 9.4) */}
          <RangeBackdrop
            areaId={activeAreaId}
            equippedBanner={playerRewards.equippedCosmetics.castleBanner}
            equippedStatue={playerRewards.equippedCosmetics.castleStatue}
            equippedGround={playerRewards.equippedCosmetics.castleGround}
            variant="arena"
          />

          {/* Archer Character & Shooting Arena */}
          <div
            className={`archer-stage archer-header phase-${shotPhase}`}
            data-testid="archer-stage"
          >
            {/* Quick Hero & Target Switcher Bar */}
            <div className="range-switcher-bar" data-testid="range-switcher-bar">
              <div className="switcher-group character-switcher" role="group" aria-label="Hero Selection">
                <button
                  type="button"
                  className={`switcher-pill ${activeCharacter === 'archer' ? 'active' : ''}`}
                  data-testid="btn-switch-archer"
                  onClick={() => handleSwitchCharacter('archer')}
                  title="Play as Archer"
                >
                  🏹 Archer
                </button>
                <button
                  type="button"
                  className={`switcher-pill ${activeCharacter === 'wizard' ? 'active' : ''}`}
                  data-testid="btn-switch-wizard"
                  onClick={() => handleSwitchCharacter('wizard')}
                  title="Play as Wizard"
                >
                  🧙‍♂️ Wizard
                </button>
              </div>

              <div className="switcher-group target-switcher" role="group" aria-label="Target Selection">
                <button
                  type="button"
                  className={`switcher-pill ${activeTarget === 'archery_target' ? 'active' : ''}`}
                  data-testid="btn-switch-target"
                  onClick={() => handleSwitchTarget('archery_target')}
                  title="Target Board"
                >
                  🎯 Target
                </button>
                <button
                  type="button"
                  className={`switcher-pill ${activeTarget === 'dummy' ? 'active' : ''}`}
                  data-testid="btn-switch-dummy"
                  onClick={() => handleSwitchTarget('dummy')}
                  title="Training Dummy"
                >
                  🪵 Dummy
                </button>
              </div>
            </div>

            <div
              className={`archer-character character-${activeCharacter} state-${archerState}`}
              data-testid="archer-character"
              data-state={archerState}
            >
              <span className="archer-icon" role="img" aria-label={activeCharacter}>
                <CharacterGraphic
                  character={activeCharacter}
                  state={archerState}
                  element={activeShot?.element}
                  equippedOutfit={playerRewards.equippedCosmetics.outfit}
                  equippedBow={playerRewards.equippedCosmetics.bow}
                />
              </span>
              {activeShot && shotPhase === 'shooting' && (
                <span
                  className={`archer-arrow-nock element-${activeShot.element} ${activeCharacter === 'wizard' ? 'wizard-spell-spark' : ''}`}
                  data-testid="archer-arrow-nock"
                  data-character={activeCharacter}
                  aria-hidden="true"
                >
                  {activeCharacter === 'wizard' ? '✨' : ELEMENT_INFO[activeShot.element].icon}
                </span>
              )}
            </div>
            <span className="game-title-badge">
              {activeCharacter === 'wizard' ? 'Math Wizard' : 'Math Archer'}
            </span>

            {/* Flying Elemental Arrow / Spell Projectile */}
            {activeShot && shotPhase !== 'idle' && (
              <div
                className={`flying-arrow character-${activeCharacter} element-${activeShot.element} outcome-${activeShot.outcome} phase-${shotPhase}`}
                data-testid="flying-arrow"
                data-character={activeCharacter}
                data-element={activeShot.element}
                data-outcome={activeShot.outcome}
                data-effect={playerRewards.equippedCosmetics.arrowEffect}
                aria-hidden="true"
              >
                <div
                  className="flying-arrow-trail"
                  data-character={activeCharacter}
                  data-effect={playerRewards.equippedCosmetics.arrowEffect}
                />
                <div className="flying-arrow-body">
                  <ElementalArrowGraphic
                    element={activeShot.element}
                    variant="projectile"
                    equippedEffect={playerRewards.equippedCosmetics.arrowEffect}
                    character={activeCharacter}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Target Question Display (Task 9.1 & Task 9.4) */}
          <TargetGraphic
            target={activeTarget}
            character={activeCharacter}
            expression={formatExpression(question)}
            hitState={targetHitState}
            activeElement={activeShot?.element}
            equippedEffect={playerRewards.equippedCosmetics.arrowEffect}
          />

          {/* Correct / Wrong Instant Feedback */}
          <div
            className={`feedback-banner phase-${shotPhase} ${
              isCorrect === true ? 'correct' : isCorrect === false ? 'wrong' : ''
            }`}
            data-testid="feedback-banner"
            aria-live="polite"
          >
            {isCorrect === true && <span>🎯 Hit!</span>}
            {isCorrect === false && (
              <span>
                {gameMode === 'adventure'
                  ? isMake10Eligible(question)
                    ? '❌ Miss! 💡 Try making 10 first.'
                    : '❌ Miss!'
                  : isMake10Eligible(question)
                    ? '❌ Miss! 💡 Make-10 explanation available below [H].'
                    : '❌ Miss! 💡 Review the explanation.'}
              </span>
            )}
          </div>

          {/* Meta Controls Row: Help button & Skill adaptation badges */}
          <div className="range-meta-row">
            {/* Guided Help Request Button (Task 4.1 & Task 4.2) */}
            {isHelpAvailable && (
              <div className="help-action-bar" data-testid="help-action-bar">
                <button
                  type="button"
                  className="request-help-button"
                  data-testid="request-help-button"
                  onClick={() => handleRequestHelp()}
                  disabled={isTransitioning}
                  aria-label="Request help and view guided make-10 hints"
                >
                  <span className="help-icon" aria-hidden="true">
                    💡
                  </span>
                  <span>
                    {gameMode === 'training'
                      ? 'Show Make-10 Explanation'
                      : 'Need Help? Show Make-10 Guide'}
                  </span>
                  <span className="help-shortcut-badge">[H]</span>
                </button>
              </div>
            )}

            {/* Learning Engine Adaptation Bar (Task 3.4) */}
            <div className="adaptation-info-bar" data-testid="adaptation-info-bar">
              <div className="adaptation-badge-group">
                <span className="active-skill-badge" data-testid="active-skill-badge">
                  🎯 {skillName}
                </span>
                <span
                  className={`pedagogical-category-badge ${categoryInfo.className}`}
                  data-testid="pedagogical-category-badge"
                >
                  {categoryInfo.label}
                </span>
              </div>
              {skillProgress && skillProgress.attempts > 0 && (
                <span className="skill-mastery-badge" data-testid="skill-mastery-badge">
                  Mastery: <strong>{skillProgress.masteryLevel}</strong> (
                  {Math.round(skillProgress.score * 100)}% score)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Quiver Answer Choices & Progress */}
        <div className="game-quiver-column">
          {/* 2x2 Elemental Answer Choices - The Archer's Quiver / Wizard's Spellbook */}
          <div className="quiver-section" data-testid="quiver-section">
            <div className="quiver-header" aria-hidden="true">
              <span className="quiver-badge">
                {activeCharacter === 'wizard' ? "🔮 WIZARD'S SPELLBOOK" : "🏹 ARCHER'S QUIVER"}
              </span>
              <span className="quiver-hint">
                {activeCharacter === 'wizard'
                  ? 'Channel a spell to cast at the target'
                  : 'Draw an arrow to loose at the target'}
              </span>
            </div>
            <div
              className="answers-grid"
              role="group"
              aria-label={
                activeCharacter === 'wizard' ? 'Elemental spell choices' : 'Elemental arrow choices'
              }
            >
              {question.choices.map((choice, index) => {
                const isSelected = selectedChoice?.element === choice.element;
                const isRevealedCorrect =
                  isTransitioning && isCorrect === false && choice.category === 'correct';

                let stateClass = '';
                if (isSelected) {
                  stateClass = isCorrect ? 'selected-correct' : 'selected-wrong';
                } else if (isRevealedCorrect) {
                  stateClass = 'revealed-correct';
                }

                const info = ELEMENT_INFO[choice.element];
                const profile = ELEMENTAL_PROFILES[choice.element];
                const controllerButton =
                  choice.element === 'fire'
                    ? 'A'
                    : choice.element === 'ice'
                      ? 'B'
                      : choice.element === 'wind'
                        ? 'X'
                        : 'Y';

                const isControllerFocused = focusedChoiceElement === choice.element;

                return (
                  <button
                    key={`${choice.element}-${choice.value}`}
                    type="button"
                    className={`arrow-button character-${activeCharacter} element-${choice.element} ${stateClass} ${isControllerFocused ? 'controller-focused' : ''}`}
                    data-testid={`choice-${choice.element}`}
                    data-element={choice.element}
                    data-arrowhead-shape={profile.arrowheadShape}
                    data-fletching-shape={profile.fletchingShape}
                    data-value={choice.value}
                    data-controller-focus={isControllerFocused ? 'true' : undefined}
                    disabled={isTransitioning}
                    onClick={() => handleSelectChoice(choice)}
                    aria-label={
                      activeCharacter === 'wizard'
                        ? `${info.label} spell, value ${choice.value}`
                        : `${info.label} arrow, value ${choice.value}`
                    }
                  >
                    {activeCharacter === 'wizard' ? (
                      <div className="wizard-spell-gem" aria-hidden="true" />
                    ) : (
                      <div className="arrow-fletching-notch" aria-hidden="true" />
                    )}

                    {/* Top meta row: element icon, name badge, and input shortcuts */}
                    <div className="arrow-card-header">
                      <div className="arrow-element-content">
                        <span className="element-icon" role="img" aria-label={info.label}>
                          {info.icon}
                        </span>
                        <div className="element-label-group">
                          <span className="element-label">{info.label}</span>
                          <span className="element-type-badge">
                            {activeCharacter === 'wizard' ? `${info.label} Spell` : profile.name}
                          </span>
                        </div>
                      </div>
                      <div className="arrow-shortcuts-group">
                        <span className="keyboard-shortcut-hint">[{index + 1}]</span>
                        <span
                          className={`controller-shortcut-hint btn-${controllerButton.toLowerCase()}`}
                          data-testid={`controller-hint-${choice.element}`}
                          aria-label={`Xbox button ${controllerButton}`}
                        >
                          ({controllerButton})
                        </span>
                      </div>
                    </div>

                    {/* Central Arrow with BIG number positioned right in the center of the arrow */}
                    <div className="arrow-centerpiece">
                      <div className="arrow-graphic-underlay" aria-hidden="true">
                        <ElementalArrowGraphic
                          element={choice.element}
                          variant="quiver"
                          character={activeCharacter}
                        />
                      </div>
                      <span className="arrow-value">{choice.value}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 17 / 50 Arrow Counter Progress (Adventure) vs Unlimited Counter (Training) */}
          <div className="progress-section" data-testid="progress-section">
            {gameMode === 'adventure' ? (
              <>
                <div className="progress-text" data-testid="arrow-counter">
                  <span
                    role="img"
                    aria-label={activeCharacter === 'wizard' ? 'spell' : 'arrow'}
                  >
                    {activeCharacter === 'wizard' ? '🔮' : '🏹'}
                  </span>
                  <span>
                    {arrowIndex} / {maxArrows}
                  </span>
                </div>
                <div className="progress-bar-container" aria-hidden="true">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${(arrowIndex / maxArrows) * 100}%` }}
                  />
                </div>
              </>
            ) : (
              <div className="training-progress-row" data-testid="training-progress-row">
                <div className="progress-text" data-testid="arrow-counter">
                  <span
                    role="img"
                    aria-label={activeCharacter === 'wizard' ? 'spell practice' : 'training'}
                  >
                    {activeCharacter === 'wizard' ? '🔮' : '🏋️'}
                  </span>
                  <span>Practice #{trainingCount + 1}</span>
                </div>
                <span className="training-unlimited-badge" data-testid="training-unlimited-badge">
                  {activeCharacter === 'wizard'
                    ? '♾️ Unlimited Spells (0 Daily Spells Used)'
                    : '♾️ Unlimited Arrows (0 Daily Arrows Used)'}
                </span>
                <div className="training-session-stats" data-testid="training-session-stats">
                  Hits: <strong>{trainingHits}</strong> / {trainingCount}
                  {trainingCount > 0 && ` (${Math.round((trainingHits / trainingCount) * 100)}%)`}
                </div>
              </div>
            )}
          </div>

          {/* Controlled Test Profile Switcher Toolbar (Task 3.4) */}
          {shouldShowProfileSelector && (
            <div
              className="profile-selector-bar"
              data-testid="profile-selector-bar"
              role="region"
              aria-label="Learning profile presets"
            >
              <div className="profile-selector-header">
                <span className="profile-selector-title">🧪 Test Controlled Profile:</span>
                <span className="profile-selector-hint">
                  Select a profile to verify adaptive question generation
                </span>
              </div>
              <div className="profile-presets-group">
                {(Object.keys(CONTROLLED_TEST_PROFILES) as ControlledTestProfileKey[]).map(
                  (key) => {
                    const preset = CONTROLLED_TEST_PROFILES[key];
                    const isActive = activePreset === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        className={`profile-preset-button ${isActive ? 'active' : ''}`}
                        data-testid={`load-preset-${key}`}
                        disabled={isTransitioning}
                        onClick={() => handleLoadControlledProfile(key)}
                        title={preset.description}
                      >
                        {preset.label}
                      </button>
                    );
                  }
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Guided Make-10 Worked Example / Progressive Hint Modal (Task 4.1 & Task 4.2) */}
      {isHelpOpen && make10Decomposition && (
        <div
          className="help-modal-backdrop"
          data-testid="help-modal-backdrop"
          onClick={handleCloseHelp}
          role="presentation"
        >
          <div
            className="worked-example-card"
            data-testid="worked-example-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="worked-example-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="worked-example-header">
              <div className="worked-example-title-group">
                <div className="hint-header-badges">
                  <span className="worked-example-badge">
                    {activeHintLevel === 'strategy_hint' && "💡 ARCHER'S STRATEGY HINT"}
                    {activeHintLevel === 'partial_decomposition' && '🧩 PARTIAL DECOMPOSITION'}
                    {activeHintLevel === 'full_explanation' && "📖 ARCHER'S GUIDE"}
                  </span>
                  <span
                    className={`hint-mode-tag ${
                      gameMode === 'training' ? 'mode-training' : 'mode-adventure'
                    }`}
                  >
                    {gameMode === 'training' ? '🏋️ Training Mode' : '🏹 Adventure Mode'}
                  </span>
                </div>
                <h3
                  id="worked-example-title"
                  className="worked-example-title"
                  data-testid="worked-example-title"
                >
                  {activeHintLevel === 'strategy_hint' &&
                    `Strategy Hint: ${make10Decomposition.left} + ${make10Decomposition.right}`}
                  {activeHintLevel === 'partial_decomposition' &&
                    `Partial Steps: ${make10Decomposition.left} + ${make10Decomposition.right}`}
                  {activeHintLevel === 'full_explanation' &&
                    `Make 10 Strategy: ${make10Decomposition.left} + ${make10Decomposition.right}`}
                </h3>
              </div>
              <button
                type="button"
                className="help-close-icon-btn"
                data-testid="close-help-icon"
                onClick={handleCloseHelp}
                aria-label="Close help"
              >
                ✕
              </button>
            </div>

            {/* Hint Level Stepper Navigation */}
            <div className="hint-level-stepper" data-testid="hint-level-stepper">
              <button
                type="button"
                className={`hint-step-tab ${activeHintLevel === 'strategy_hint' ? 'active' : ''}`}
                data-testid="tab-strategy-hint"
                onClick={() => {
                  setActiveHintLevel('strategy_hint');
                  updateHighestHintLevel('strategy_hint');
                }}
              >
                💡 Strategy Hint
              </button>
              <button
                type="button"
                className={`hint-step-tab ${
                  activeHintLevel === 'partial_decomposition' ? 'active' : ''
                }`}
                data-testid="tab-partial-decomposition"
                onClick={() => {
                  setActiveHintLevel('partial_decomposition');
                  updateHighestHintLevel('partial_decomposition');
                }}
              >
                🧩 Partial Steps
              </button>
              <button
                type="button"
                className={`hint-step-tab ${
                  activeHintLevel === 'full_explanation' ? 'active' : ''
                }`}
                data-testid="tab-full-explanation"
                onClick={() => {
                  setActiveHintLevel('full_explanation');
                  updateHighestHintLevel('full_explanation');
                }}
              >
                📖 Full Explanation
              </button>
            </div>

            {/* Content Level 1: Strategy Hint (Does NOT dump full explanation!) */}
            {activeHintLevel === 'strategy_hint' && (
              <div className="strategy-hint-card" data-testid="strategy-hint-card">
                <div className="strategy-hint-headline" data-testid="strategy-hint-headline">
                  {questionHint.level === 'strategy_hint'
                    ? questionHint.headline
                    : '💡 Make 10 first!'}
                </div>
                <p className="strategy-hint-prompt" data-testid="strategy-hint-prompt">
                  {questionHint.level === 'strategy_hint'
                    ? questionHint.prompt
                    : `Break apart ${make10Decomposition.right} to help ${make10Decomposition.left} make 10.`}
                </p>
                <div className="strategy-hint-target" data-testid="strategy-hint-target">
                  🎯 <strong>Clue:</strong> {make10Decomposition.left} needs{' '}
                  <span className="highlight-needed">{make10Decomposition.needed}</span> to make 10.
                  Can you split {make10Decomposition.right}?
                </div>

                <div className="hint-action-row">
                  <button
                    type="button"
                    className="show-partial-hint-button"
                    data-testid="show-partial-hint-button"
                    onClick={() => {
                      setActiveHintLevel('partial_decomposition');
                      updateHighestHintLevel('partial_decomposition');
                    }}
                  >
                    🧩 Need More Help? Show Partial Step [P]
                  </button>
                  <button
                    type="button"
                    className="show-full-explanation-button secondary"
                    data-testid="show-full-explanation-button"
                    onClick={() => {
                      setActiveHintLevel('full_explanation');
                      updateHighestHintLevel('full_explanation');
                    }}
                  >
                    📖 Show Full Explanation [F]
                  </button>
                </div>
              </div>
            )}

            {/* Content Level 2: Partial Decomposition (Step 1 & split scaffold without final answer) */}
            {activeHintLevel === 'partial_decomposition' && (
              <div className="partial-decomposition-card" data-testid="partial-decomposition-card">
                <div className="partial-steps-row">
                  <div className="make10-step-card step-1" data-testid="make10-step-1">
                    <div className="step-header">
                      <span className="step-badge">Step 1</span>
                      <span className="step-title">{make10Decomposition.steps[0].title}</span>
                    </div>
                    <div className="step-equation" data-testid="step-1-equation">
                      {make10Decomposition.steps[0].equation}
                    </div>
                    <p className="step-detail">{make10Decomposition.steps[0].detail}</p>
                  </div>

                  <div
                    className="make10-step-card step-2-scaffold"
                    data-testid="partial-split-card"
                  >
                    <div className="step-header">
                      <span className="step-badge">Step 2 Scaffold</span>
                      <span className="step-title">Split {make10Decomposition.right}</span>
                    </div>
                    <div className="step-equation" data-testid="partial-split-equation">
                      {make10Decomposition.right} = {make10Decomposition.needed} +{' '}
                      {make10Decomposition.remaining}
                    </div>
                    <p className="step-detail">
                      Give {make10Decomposition.needed} to {make10Decomposition.left} to make 10,
                      leaving {make10Decomposition.remaining} left over!
                    </p>
                  </div>
                </div>

                <div className="partial-scaffold-box" data-testid="partial-scaffold-box">
                  <div className="scaffold-equation" data-testid="partial-scaffold-equation">
                    {make10Decomposition.left} + {make10Decomposition.right} = 10 +{' '}
                    {make10Decomposition.remaining} = ?
                  </div>
                  <p className="scaffold-prompt">
                    Now add the remaining {make10Decomposition.remaining} to 10 to find the answer!
                  </p>
                </div>

                <div className="hint-action-row">
                  <button
                    type="button"
                    className="show-full-explanation-button"
                    data-testid="show-full-explanation-button"
                    onClick={() => {
                      setActiveHintLevel('full_explanation');
                      updateHighestHintLevel('full_explanation');
                    }}
                  >
                    📖 Still Stuck? Show Complete Explanation [F]
                  </button>
                </div>
              </div>
            )}

            {/* Content Level 3: Complete Explanation (Full 3 steps, 10-frames model, summary equation) */}
            {activeHintLevel === 'full_explanation' && (
              <div className="full-explanation-container" data-testid="full-explanation-content">
                <p className="worked-example-intro">
                  Break the second number apart to make 10 with the first number!
                </p>

                {/* 3 Guided Steps */}
                <div className="make10-steps-container">
                  <div className="make10-step-card step-1" data-testid="make10-step-1">
                    <div className="step-header">
                      <span className="step-badge">Step 1</span>
                      <span className="step-title">{make10Decomposition.steps[0].title}</span>
                    </div>
                    <div className="step-equation" data-testid="step-1-equation">
                      {make10Decomposition.steps[0].equation}
                    </div>
                    <p className="step-detail">{make10Decomposition.steps[0].detail}</p>
                  </div>

                  <div className="make10-step-card step-2" data-testid="make10-step-2">
                    <div className="step-header">
                      <span className="step-badge">Step 2</span>
                      <span className="step-title">{make10Decomposition.steps[1].title}</span>
                    </div>
                    <div className="step-equation" data-testid="step-2-equation">
                      {make10Decomposition.steps[1].equation}
                    </div>
                    <p className="step-detail">{make10Decomposition.steps[1].detail}</p>
                  </div>

                  <div className="make10-step-card step-3" data-testid="make10-step-3">
                    <div className="step-header">
                      <span className="step-badge">Step 3</span>
                      <span className="step-title">{make10Decomposition.steps[2].title}</span>
                    </div>
                    <div className="step-equation" data-testid="step-3-equation">
                      {make10Decomposition.steps[2].equation}
                    </div>
                    <p className="step-detail">{make10Decomposition.steps[2].detail}</p>
                  </div>
                </div>

                {/* Visual Ten-Frames Model */}
                <div className="ten-frames-visual" data-testid="ten-frames-visual">
                  <div className="ten-frame-group">
                    <div className="ten-frame-label">
                      First Ten-Frame (10 full): {make10Decomposition.left} +{' '}
                      {make10Decomposition.needed}
                    </div>
                    <div className="ten-frame-grid frame-1">
                      {make10Decomposition.visual.frame1.map((slot) => (
                        <div
                          key={`f1-${slot.index}`}
                          className={`ten-frame-slot slot-${slot.type}`}
                          title={
                            slot.type === 'first' ? `Start: ${slot.label}` : `Needed: ${slot.label}`
                          }
                        >
                          <span className="dot" />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="ten-frame-plus" aria-hidden="true">
                    +
                  </div>

                  <div className="ten-frame-group">
                    <div className="ten-frame-label">
                      Remainder Frame: {make10Decomposition.remaining}
                    </div>
                    <div className="ten-frame-grid frame-2">
                      {make10Decomposition.visual.frame2.map((slot) => (
                        <div
                          key={`f2-${slot.index}`}
                          className={`ten-frame-slot slot-${slot.type}`}
                          title={slot.type === 'remaining' ? `Remaining: ${slot.label}` : 'Empty'}
                        >
                          {slot.filled && <span className="dot" />}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Complete Worked Example Summary Equation */}
                <div className="make10-summary-box" data-testid="make10-summary">
                  <div className="summary-equation-line" data-testid="summary-equation">
                    {make10Decomposition.summary.equation}
                  </div>
                  <p className="summary-text-line">{make10Decomposition.summary.text}</p>
                </div>
              </div>
            )}

            <div className="worked-example-footer">
              <button
                type="button"
                className="close-help-button"
                data-testid="close-help-button"
                onClick={handleCloseHelp}
              >
                🏹 Got It! Ready to Shoot
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
