import { getAllSkills, type Operation, type Skill } from '../curriculum';
import { detectSystematicMistakes, generatePracticeRecommendation } from '../recommendations/generator';
import { parsePairKey } from '../skills/profile';
import { getDefaultStorage } from '../session/storage';
import type { DailySession, SessionStorageAdapter } from '../session/types';
import type { Attempt, SkillProfile } from '../skills/types';
import { loadLocalProgress } from '../history/attemptHistory';
import type {
  DailyChartPoint,
  OverallDashboardMetrics,
  OperationComparison,
  ParentDashboardData,
  PerformanceTrend,
  PerformanceTrendStatus,
  SkillSummaryItem,
  TodayDashboardMetrics,
  WeakPairDetail,
  WeakerOperation,
} from './types';

/**
 * Returns a date string in YYYY-MM-DD format.
 */
function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Returns short day of week (e.g. 'Mon', 'Tue', 'Wed') for a YYYY-MM-DD string.
 */
function getDayOfWeek(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  } catch {
    return dateStr;
  }
}

/**
 * Categorizes a skill into addition, subtraction, or foundations.
 */
function getSkillCategory(skillId: Skill): 'addition' | 'subtraction' | 'foundations' {
  if (skillId.includes('subtraction')) return 'subtraction';
  if (skillId.includes('addition')) return 'addition';
  return 'foundations';
}

/**
 * Computes all Parent Dashboard metrics from player profile, sessions, and attempts.
 */
export function computeParentDashboardData(options: {
  playerId?: string;
  profile: SkillProfile;
  sessions?: readonly DailySession[];
  attempts?: readonly Attempt[];
  date?: string;
}): ParentDashboardData {
  const playerId = options.playerId || options.profile.playerId || 'player-local';
  const targetDate = options.date || getTodayDateString();
  const sessions = options.sessions ?? [];
  const attempts = options.attempts ?? [];
  const profile = options.profile;

  // -------------------------------------------------------------
  // 1. Today's Metrics (Question 1: How much did my child practice?)
  // -------------------------------------------------------------
  const todaySession = sessions.find((s) => s.date === targetDate);
  const todayAttempts = attempts.filter((a) => a.timestamp && a.timestamp.startsWith(targetDate));

  const arrowsAllowed = todaySession?.arrowsAllowed ?? 50;
  const arrowsUsed = todaySession ? todaySession.arrowsUsed : todayAttempts.length;
  const arrowsRemaining = Math.max(0, arrowsAllowed - arrowsUsed);

  let sessionStatus: TodayDashboardMetrics['sessionStatus'] = 'not_started';
  if (todaySession) {
    sessionStatus = todaySession.status;
  } else if (todayAttempts.length > 0) {
    sessionStatus = arrowsRemaining === 0 ? 'completed' : 'in_progress';
  }

  const todayAttemptsCount = todayAttempts.length;
  const todayHitsCount = todayAttemptsCount > 0
    ? todayAttempts.filter((a) => a.correct).length
    : (todaySession?.hits ?? 0);

  const todayAccuracy = todayAttemptsCount > 0
    ? Number((todayHitsCount / todayAttemptsCount).toFixed(4))
    : arrowsUsed > 0 && todaySession
    ? Number((todaySession.hits / arrowsUsed).toFixed(4))
    : 0;

  const todayAdditionAttempts = todayAttempts.filter((a) => a.operation === 'add');
  const todayAdditionCorrect = todayAdditionAttempts.filter((a) => a.correct).length;
  const todayAdditionAccuracy = todayAdditionAttempts.length > 0
    ? Number((todayAdditionCorrect / todayAdditionAttempts.length).toFixed(4))
    : 0;

  const todaySubtractionAttempts = todayAttempts.filter((a) => a.operation === 'subtract');
  const todaySubtractionCorrect = todaySubtractionAttempts.filter((a) => a.correct).length;
  const todaySubtractionAccuracy = todaySubtractionAttempts.length > 0
    ? Number((todaySubtractionCorrect / todaySubtractionAttempts.length).toFixed(4))
    : 0;

  const todayTotalResponseTime = todayAttempts.reduce((sum, a) => sum + (a.responseTimeMs || 0), 0);
  const todayAverageResponseTimeMs = todayAttemptsCount > 0
    ? Math.round(todayTotalResponseTime / todayAttemptsCount)
    : 0;

  const todayHintsUsed = todayAttempts.filter((a) => a.hintUsed).length;
  const todayHintRate = todayAttemptsCount > 0
    ? Number((todayHintsUsed / todayAttemptsCount).toFixed(4))
    : 0;

  const today: TodayDashboardMetrics = {
    arrowsUsed,
    arrowsAllowed,
    arrowsRemaining,
    sessionStatus,
    attemptsCount: todayAttemptsCount,
    hitsCount: todayHitsCount,
    accuracy: todayAccuracy,
    additionAccuracy: todayAdditionAccuracy,
    subtractionAccuracy: todaySubtractionAccuracy,
    averageResponseTimeMs: todayAverageResponseTimeMs,
    hintRate: todayHintRate,
    hintsUsed: todayHintsUsed,
  };

  // -------------------------------------------------------------
  // 2. Overall Metrics (Question 2: How accurate were they?)
  // -------------------------------------------------------------
  const totalAttempts = attempts.length;
  const totalHits = attempts.filter((a) => a.correct).length;
  const overallAccuracy = totalAttempts > 0
    ? Number((totalHits / totalAttempts).toFixed(4))
    : 0;

  const totalSessions = sessions.length;
  const completedSessions = sessions.filter((s) => s.status === 'completed').length;

  const distinctDates = new Set<string>();
  for (const s of sessions) distinctDates.add(s.date);
  for (const a of attempts) {
    if (a.timestamp) distinctDates.add(a.timestamp.slice(0, 10));
  }
  const daysPracticed = distinctDates.size;

  const additionAttempts = attempts.filter((a) => a.operation === 'add');
  const additionCorrect = additionAttempts.filter((a) => a.correct).length;
  const additionAccuracy = additionAttempts.length > 0
    ? Number((additionCorrect / additionAttempts.length).toFixed(4))
    : 0;

  const subtractionAttempts = attempts.filter((a) => a.operation === 'subtract');
  const subtractionCorrect = subtractionAttempts.filter((a) => a.correct).length;
  const subtractionAccuracy = subtractionAttempts.length > 0
    ? Number((subtractionCorrect / subtractionAttempts.length).toFixed(4))
    : 0;

  const overallTotalResponseTime = attempts.reduce((sum, a) => sum + (a.responseTimeMs || 0), 0);
  const overallAverageResponseTimeMs = totalAttempts > 0
    ? Math.round(overallTotalResponseTime / totalAttempts)
    : 0;

  const overallHintsUsed = attempts.filter((a) => a.hintUsed).length;
  const overallHintRate = totalAttempts > 0
    ? Number((overallHintsUsed / totalAttempts).toFixed(4))
    : 0;

  const overall: OverallDashboardMetrics = {
    totalAttempts,
    totalHits,
    accuracy: overallAccuracy,
    totalSessions,
    completedSessions,
    daysPracticed,
    additionAttempts: additionAttempts.length,
    additionCorrect,
    additionAccuracy,
    subtractionAttempts: subtractionAttempts.length,
    subtractionCorrect,
    subtractionAccuracy,
    averageResponseTimeMs: overallAverageResponseTimeMs,
    hintsUsed: overallHintsUsed,
    hintRate: overallHintRate,
  };

  // -------------------------------------------------------------
  // 3. Operation Comparison (Question 3: Is addition or subtraction weaker?)
  // -------------------------------------------------------------
  let weakerOperation: WeakerOperation = 'insufficient_data';
  let summary = 'Need at least 2 attempts in both addition and subtraction to compare.';
  const diff = Number((additionAccuracy - subtractionAccuracy).toFixed(4));

  if (additionAttempts.length < 2 && subtractionAttempts.length < 2) {
    weakerOperation = 'insufficient_data';
    summary = 'Not enough practice in either operation to determine relative strengths.';
  } else if (additionAttempts.length < 2) {
    weakerOperation = 'insufficient_data';
    summary = 'Need more practice in addition to compare against subtraction.';
  } else if (subtractionAttempts.length < 2) {
    weakerOperation = 'insufficient_data';
    summary = 'Need more practice in subtraction to compare against addition.';
  } else {
    // Both have at least 2 attempts
    const threshold = 0.04; // 4% difference
    if (diff > threshold) {
      weakerOperation = 'subtraction';
      summary = `Subtraction is weaker (${Math.round(subtractionAccuracy * 100)}% vs ${Math.round(additionAccuracy * 100)}% for addition).`;
    } else if (diff < -threshold) {
      weakerOperation = 'addition';
      summary = `Addition is weaker (${Math.round(additionAccuracy * 100)}% vs ${Math.round(subtractionAccuracy * 100)}% for subtraction).`;
    } else {
      weakerOperation = 'equal';
      summary = `Addition and subtraction performance are balanced (${Math.round(additionAccuracy * 100)}% vs ${Math.round(subtractionAccuracy * 100)}%).`;
    }
  }

  const operationComparison: OperationComparison = {
    weakerOperation,
    additionAccuracy,
    subtractionAccuracy,
    additionAttempts: additionAttempts.length,
    subtractionAttempts: subtractionAttempts.length,
    difference: diff,
    summary,
    isAdditionWeaker: weakerOperation === 'addition',
    isSubtractionWeaker: weakerOperation === 'subtraction',
  };

  // -------------------------------------------------------------
  // 4. Skill Breakdown (Question 4: Which specific skills are weak?)
  // -------------------------------------------------------------
  const allCurriculumSkills = getAllSkills();
  const skills: SkillSummaryItem[] = allCurriculumSkills.map((def) => {
    const sp = profile.skills[def.id];
    const skillAttempts = sp?.attempts ?? 0;
    const skillCorrect = sp?.correct ?? 0;
    const skillAccuracy = sp?.accuracy ?? 0;
    const recentAcc = sp?.recentAccuracy ?? skillAccuracy;
    const mastery = sp?.masteryLevel ?? 'weak';
    const isWeakSkill = skillAttempts >= 2
      ? mastery === 'weak' || skillAccuracy < 0.70
      : false;

    return {
      skillId: def.id,
      name: def.name,
      category: getSkillCategory(def.id),
      attempts: skillAttempts,
      correct: skillCorrect,
      accuracy: skillAccuracy,
      recentAccuracy: recentAcc,
      masteryLevel: mastery,
      isWeak: isWeakSkill,
      averageResponseTimeMs: sp?.averageResponseTimeMs ?? 0,
      hintsUsed: sp?.hintsUsed ?? 0,
      hintRate: sp?.hintRate ?? 0,
    };
  });

  // Weak skills filtered and sorted by lowest accuracy, then highest attempts
  const weakSkills = skills
    .filter((s) => s.isWeak)
    .sort((a, b) => {
      if (a.accuracy !== b.accuracy) return a.accuracy - b.accuracy;
      return b.attempts - a.attempts;
    });

  // -------------------------------------------------------------
  // 5. Weak Combinations (Question 5: Which exact number combinations cause problems?)
  // -------------------------------------------------------------
  const systematicMistakes = detectSystematicMistakes(attempts, profile, 2);
  const systematicMap = new Map<string, { wrongAnswer: number; count: number }>();
  for (const sm of systematicMistakes) {
    systematicMap.set(sm.pairKey, { wrongAnswer: sm.wrongAnswer, count: sm.occurrences });
  }

  const weakPairs: WeakPairDetail[] = [];
  for (const pair of Object.values(profile.pairs)) {
    // Only include pairs with at least 2 attempts and accuracy below 75%
    if (pair.attempts >= 2 && pair.accuracy < 0.75) {
      const misses = pair.attempts - pair.correct;
      const parsed = parsePairKey(pair.key);
      const left = parsed?.left ?? pair.left;
      const operation: Operation = parsed?.operation ?? pair.operation ?? 'add';
      const right = parsed?.right ?? pair.right;
      const expectedAnswer = operation === 'add' ? left + right : left - right;

      weakPairs.push({
        pairKey: pair.key,
        left,
        operation,
        right,
        expectedAnswer,
        attempts: pair.attempts,
        correct: pair.correct,
        misses,
        accuracy: pair.accuracy,
        averageResponseTimeMs: pair.averageResponseTimeMs,
        systematicMistake: systematicMap.get(pair.key),
      });
    }
  }

  // Sort weak pairs by lowest accuracy, then highest misses count
  weakPairs.sort((a, b) => {
    if (a.accuracy !== b.accuracy) return a.accuracy - b.accuracy;
    return b.misses - a.misses;
  });

  // -------------------------------------------------------------
  // 6. Performance Improvement & Historical Trend (Question 6: Is performance improving?)
  // -------------------------------------------------------------
  // Group attempts and sessions by date to build daily history
  const dateMap = new Map<
    string,
    { arrowsUsed: number; attempts: number; hits: number }
  >();

  // Add session data
  for (const s of sessions) {
    dateMap.set(s.date, {
      arrowsUsed: s.arrowsUsed,
      attempts: 0,
      hits: s.hits,
    });
  }

  // Add or combine attempt data
  for (const a of attempts) {
    if (!a.timestamp) continue;
    const dateKey = a.timestamp.slice(0, 10);
    const existing = dateMap.get(dateKey) || { arrowsUsed: 0, attempts: 0, hits: 0 };
    existing.attempts += 1;
    if (a.correct) {
      existing.hits += 1;
    }
    dateMap.set(dateKey, existing);
  }

  // Build sorted daily chart points (chronological)
  const sortedDates = Array.from(dateMap.keys()).sort();
  const history: DailyChartPoint[] = sortedDates.map((dateKey) => {
    const data = dateMap.get(dateKey)!;
    const totalCount = data.attempts > 0 ? data.attempts : data.arrowsUsed;
    const acc = totalCount > 0 ? Number((data.hits / totalCount).toFixed(4)) : 0;
    return {
      date: dateKey,
      dayOfWeek: getDayOfWeek(dateKey),
      arrowsUsed: data.arrowsUsed > 0 ? data.arrowsUsed : data.attempts,
      attempts: data.attempts,
      hits: data.hits,
      accuracy: acc,
    };
  });

  // Calculate improvement trend
  let status: PerformanceTrendStatus = 'insufficient_data';
  let recentAccuracy = 0;
  let baselineAccuracy = 0;
  let changePercentage = 0;
  let trendSummary = 'Practice more questions to establish an improvement trend.';

  if (totalAttempts >= 8) {
    const windowSize = Math.min(15, Math.floor(totalAttempts / 2));
    const recentSlice = attempts.slice(-windowSize);
    const baselineSlice = attempts.slice(0, totalAttempts - windowSize);

    if (baselineSlice.length >= 4) {
      const recentHits = recentSlice.filter((a) => a.correct).length;
      recentAccuracy = Number((recentHits / recentSlice.length).toFixed(4));

      const baselineHits = baselineSlice.filter((a) => a.correct).length;
      baselineAccuracy = Number((baselineHits / baselineSlice.length).toFixed(4));

      const delta = Number((recentAccuracy - baselineAccuracy).toFixed(4));
      changePercentage = Math.round(delta * 100);

      if (delta >= 0.08) {
        status = 'improving';
        trendSummary = `Performance is improving! Recent accuracy is up +${changePercentage}% (${Math.round(recentAccuracy * 100)}% vs ${Math.round(baselineAccuracy * 100)}% previously).`;
      } else if (delta <= -0.08) {
        status = 'declining';
        trendSummary = `Performance has dipped ${changePercentage}% recently (${Math.round(recentAccuracy * 100)}% vs ${Math.round(baselineAccuracy * 100)}% previously). Needs reinforcement.`;
      } else {
        status = 'steady';
        trendSummary = `Performance is steady at around ${Math.round(recentAccuracy * 100)}% accuracy (${changePercentage >= 0 ? '+' : ''}${changePercentage}% change).`;
      }
    }
  }

  const trend: PerformanceTrend = {
    status,
    recentAccuracy,
    baselineAccuracy,
    changePercentage,
    summary: trendSummary,
    history,
  };

  // -------------------------------------------------------------
  // 7. Today's Focus & Recommendation (Section 12 of plan)
  // -------------------------------------------------------------
  let recommendation;
  try {
    recommendation = generatePracticeRecommendation(profile, attempts);
  } catch {
    // Gracefully handle any empty profile
  }

  return {
    playerId,
    date: targetDate,
    today,
    overall,
    operationComparison,
    skills,
    weakSkills,
    weakPairs,
    trend,
    recommendation,
  };
}

/**
 * Loads a player's local progress and computes complete Parent Dashboard data.
 */
export function loadParentDashboard(
  playerId: string = 'player-local',
  storage: SessionStorageAdapter = getDefaultStorage(),
  date?: string
): ParentDashboardData {
  const progress = loadLocalProgress(playerId, storage, date);
  return computeParentDashboardData({
    playerId,
    profile: progress.profile,
    sessions: progress.sessions,
    attempts: progress.attempts,
    date,
  });
}

