import React, { useEffect, useMemo, useState } from 'react';
import {
  ADAPTIVE_POLICY,
  computeReasoningProgress,
  defaultReasoningSettings,
  generateDailyCollection,
  generateInstructionChain,
  generateUnknownStart,
  isReasoningSettings,
  MISSION_FAMILIES,
  OBJECTIVE_FAMILY,
  recommendFocus,
  recommendSupport,
  recordMissionResponse,
  startMissionAttempt,
  summarizeIndependentStability,
  type FocusRecommendation,
  type IndependentStability,
  type MissionAttempt,
  type MissionFamily,
  type MissionObjective,
  type ReasoningEvidence,
  type ReasoningFamilyProgress,
  type ReasoningProgress,
  type ReasoningSettings,
  type SessionStorageAdapter,
  type SupportRecommendation,
} from '@math-archer/learning-engine';
import type { ChildPublicProfile, MathArcherApiClient } from '../api/client';
import { loadReasoningSettings } from '../reasoningPreferences';
import { hydratePlayerProgress } from '../sync';
import { loadMissionWorkspace, syncMissionAttempts } from '../sync/missions';
import { REASONING_FAMILY_META, REASONING_OBJECTIVE_LABELS } from './ReasoningPanel';

export async function hydrateChildDashboardProgress(
  playerId: string,
  apiClient: MathArcherApiClient,
  storage: SessionStorageAdapter
) {
  const res = await hydratePlayerProgress(playerId, apiClient, storage);
  await syncMissionAttempts(playerId, apiClient, storage);
  return res;
}

export interface ReasoningPerformanceSectionProps {
  playerId: string;
  child?: ChildPublicProfile;
  settings?: ReasoningSettings;
  storage: SessionStorageAdapter;
  preview: boolean;
}

function completeAttemptWithFirstTry(
  attempt: MissionAttempt,
  time: string,
  wrongFirstStepIds: ReadonlySet<string> = new Set()
): MissionAttempt {
  let current = attempt;
  const steps =
    current.mission.support === 'independent'
      ? [current.mission.steps.at(-1)!]
      : current.mission.steps;
  let seq = 1;
  for (const step of steps) {
    if (wrongFirstStepIds.has(step.id)) {
      const wrong = step.choices.find((c) => c.id !== step.correctChoiceId);
      if (wrong) {
        current = recordMissionResponse(current, {
          eventId: `${current.id}_ev_${seq++}`,
          stepId: step.id,
          choiceId: wrong.id,
          timestamp: time,
          responseTimeMs: 3200,
        });
      }
    }
    current = recordMissionResponse(current, {
      eventId: `${current.id}_ev_${seq++}`,
      stepId: step.id,
      choiceId: step.correctChoiceId,
      timestamp: time,
      responseTimeMs: 2400,
    });
  }
  return current;
}

function createSampleReasoningAttempts(playerId: string): MissionAttempt[] {
  const attempts: MissionAttempt[] = [];
  const icSeeds = [11, 22, 33];
  icSeeds.forEach((seed, idx) => {
    const mission = generateInstructionChain({
      seed,
      support: 'guided',
      wording: idx % 2 === 0 ? 'school' : 'plain',
    });
    const started = startMissionAttempt(
      mission,
      playerId,
      `sample-ic-${seed}`,
      `2026-09-1${idx + 2}T10:00:00.000Z`
    );
    attempts.push(
      completeAttemptWithFirstTry(
        started,
        `2026-09-1${idx + 2}T10:02:00.000Z`,
        idx < 2 ? new Set(['difference']) : new Set()
      )
    );
  });

  const icIndep = generateInstructionChain({
    seed: 44,
    support: 'independent',
    wording: 'school',
  });
  attempts.push(
    completeAttemptWithFirstTry(
      startMissionAttempt(icIndep, playerId, 'sample-ic-indep', '2026-09-15T10:00:00.000Z'),
      '2026-09-15T10:01:00.000Z'
    )
  );

  const dcGuided = generateDailyCollection({ seed: 15, support: 'guided', wording: 'school' });
  attempts.push(
    completeAttemptWithFirstTry(
      startMissionAttempt(dcGuided, playerId, 'sample-dc-1', '2026-09-14T11:00:00.000Z'),
      '2026-09-14T11:02:00.000Z'
    )
  );

  const dcIndep = generateDailyCollection({ seed: 29, support: 'independent', wording: 'plain' });
  attempts.push(
    completeAttemptWithFirstTry(
      startMissionAttempt(dcIndep, playerId, 'sample-dc-2', '2026-09-16T11:00:00.000Z'),
      '2026-09-16T11:01:00.000Z'
    )
  );

  const usGuided = generateUnknownStart({ seed: 19, support: 'guided', wording: 'school' });
  attempts.push(
    completeAttemptWithFirstTry(
      startMissionAttempt(usGuided, playerId, 'sample-us-1', '2026-09-16T12:00:00.000Z'),
      '2026-09-16T12:02:00.000Z'
    )
  );

  return attempts;
}

function getFamilyBadgeInfo(
  counts: ReasoningFamilyProgress | undefined,
  supportRec: SupportRecommendation,
  stability: IndependentStability
): { label: string; className: string } {
  if (!counts || counts.startedMissions === 0) {
    return { label: 'not practiced', className: 'badge trend-insufficient' };
  }
  if (stability.stable) {
    return { label: 'stable independent', className: 'badge badge-mastered' };
  }
  if (supportRec.change === 'fade') {
    return { label: 'ready for independent', className: 'badge badge-strong' };
  }
  if (supportRec.change === 'restore') {
    return { label: 'restore guided', className: 'badge badge-weak' };
  }
  return {
    label: supportRec.support === 'independent' ? 'independent' : 'guided',
    className: 'badge badge-developing',
  };
}

interface FamilyRowProps {
  family: MissionFamily;
  enabled: boolean;
  counts?: ReasoningFamilyProgress;
  supportRec: SupportRecommendation;
  stability: IndependentStability;
}

const FamilyBreakdownRow: React.FC<FamilyRowProps> = ({
  family,
  enabled,
  counts,
  supportRec,
  stability,
}) => {
  const meta = REASONING_FAMILY_META[family];
  const badge = getFamilyBadgeInfo(counts, supportRec, stability);
  const started = counts?.startedMissions ?? 0;
  const completed = counts?.completedMissions ?? 0;
  const assisted = counts?.assistedCompletions ?? 0;
  const indepAttempts = counts?.independentAttempts ?? 0;
  const indepSuccesses = counts?.independentSuccesses ?? 0;
  const indepPct = indepAttempts > 0 ? Math.round((indepSuccesses / indepAttempts) * 100) : null;

  return (
    <div
      className={`skill-row ${supportRec.change === 'restore' ? 'weak' : stability.stable ? 'mastered' : ''}`}
      data-testid={`reasoning-family-row-${family}`}
    >
      <div className="skill-info">
        <div className="skill-name">
          <span>{meta.name}</span>
          <span className={badge.className} data-testid={`reasoning-family-badge-${family}`}>
            {badge.label}
          </span>
          <span
            className={`pin-badge ${enabled ? 'pin-locked' : 'pin-open'}`}
            data-testid={`reasoning-family-enabled-${family}`}
          >
            {enabled ? 'On' : 'Off'}
          </span>
        </div>
        <div className="skill-meta">
          {started > 0 ? (
            <>
              {completed}/{started} completed • {assisted} with help •{' '}
              {indepAttempts > 0
                ? `${indepSuccesses}/${indepAttempts} independent first answers correct`
                : 'No independent attempts yet'}
              {supportRec.window > 0 && (
                <>
                  {' '}
                  • Next support: <strong>{supportRec.support}</strong> ({supportRec.successes}/
                  {supportRec.window} recent unassisted across {supportRec.wordingVariants} wording
                  {supportRec.wordingVariants === 1 ? '' : 's'})
                </>
              )}
            </>
          ) : (
            <span style={{ color: '#9ca3af' }}>Not practiced yet — starts in Guided mode</span>
          )}
        </div>
      </div>
      <div className="skill-metrics">
        <span className="skill-acc" data-testid={`reasoning-family-acc-${family}`}>
          {indepPct !== null ? `${indepPct}%` : started > 0 ? `${completed}/${started}` : '—'}
        </span>
      </div>
    </div>
  );
};

interface ObjectiveCardProps {
  objective: MissionObjective;
  evidence: ReasoningEvidence;
}

const ObjectiveEvidenceCard: React.FC<ObjectiveCardProps> = ({ objective, evidence }) => {
  const label = REASONING_OBJECTIVE_LABELS[objective];
  const familyKey = OBJECTIVE_FAMILY[objective];
  const familyName = familyKey ? REASONING_FAMILY_META[familyKey].name : 'Shared calculation';
  const firstPct = Math.round((evidence.firstCorrect / evidence.observations) * 100);
  const unassistedPct =
    evidence.unassistedObservations > 0
      ? Math.round((evidence.unassistedCorrect / evidence.unassistedObservations) * 100)
      : null;
  const isWeak =
    Boolean(familyKey) &&
    evidence.unassistedObservations >= ADAPTIVE_POLICY.focus.minObservations &&
    evidence.unassistedCorrect / evidence.unassistedObservations <=
      ADAPTIVE_POLICY.focus.maxAccuracy;

  return (
    <div
      className="weak-pair-card"
      data-testid={`reasoning-objective-card-${objective}`}
      style={{
        background: isWeak ? '#fff5f5' : '#f8fafc',
        borderColor: isWeak ? '#fecaca' : '#e2e8f0',
      }}
    >
      <div
        className="pair-expression"
        style={{
          fontFamily: 'inherit',
          fontSize: 15,
          color: isWeak ? '#991b1b' : '#0f172a',
        }}
      >
        {label}
      </div>
      <div className="pair-stat" style={{ color: '#64748b', fontWeight: 600 }}>
        {familyName}
      </div>
      <div className="pair-stat">
        First answer: <strong>{firstPct}%</strong> ({evidence.firstCorrect}/{evidence.observations})
      </div>
      <div className="pair-stat">
        Unassisted: <strong>{unassistedPct !== null ? `${unassistedPct}%` : '—'}</strong> (
        {evidence.unassistedCorrect}/{evidence.unassistedObservations})
      </div>
      {isWeak && (
        <div className="pair-mistake" data-testid={`reasoning-objective-weak-${objective}`}>
          Needs reinforcement (≤{Math.round(ADAPTIVE_POLICY.focus.maxAccuracy * 100)}% unassisted)
        </div>
      )}
    </div>
  );
};

const ReasoningFocusCard: React.FC<{ focus: FocusRecommendation }> = ({ focus }) => {
  const objectiveLabel = REASONING_OBJECTIVE_LABELS[focus.objective];
  const familyMeta = REASONING_FAMILY_META[focus.family];
  const accPct = Math.round(focus.accuracy * 100);

  return (
    <div
      className="focus-data-trace"
      data-testid="reasoning-focus-card"
      style={{ marginTop: 16, borderColor: '#bfdbfe', background: '#eff6ff' }}
    >
      <div className="data-trace-header">
        <span className="data-trace-badge" style={{ color: '#1e3a8a' }}>
          🎯 Recommended Reasoning Focus: {objectiveLabel} ({familyMeta.name})
        </span>
        <span className="focus-action-pill">reinforce relationship</span>
      </div>
      <div className="data-trace-audit" style={{ color: '#1e40af', marginBottom: 8 }}>
        Lowest unassisted first-response accuracy among observed reasoning relationships:{' '}
        <strong>{accPct}%</strong> across <strong>{focus.observations}</strong> unassisted
        observations. Training and Adventure missions will prioritize{' '}
        <strong>{familyMeta.name}</strong>.
      </div>
    </div>
  );
};

function readWorkspaceAttempts(
  playerId: string,
  storage: SessionStorageAdapter,
  preview: boolean
): { attempts: MissionAttempt[]; pendingCount: number; conflictCount: number } {
  if (preview) {
    return {
      attempts: createSampleReasoningAttempts(playerId),
      pendingCount: 0,
      conflictCount: 0,
    };
  }
  try {
    const workspace = loadMissionWorkspace(playerId, storage);
    const attempts = workspace.items.map((item) =>
      item.conflict && item.server ? item.server.attempt : item.local
    );
    return {
      attempts,
      pendingCount: workspace.items.filter((item) => item.pending).length,
      conflictCount: workspace.items.filter((item) => item.conflict).length,
    };
  } catch {
    return { attempts: [], pendingCount: 0, conflictCount: 0 };
  }
}

function resolveEffectiveSettings(
  playerId: string,
  cloudSettings: ReasoningSettings | undefined,
  storage: SessionStorageAdapter,
  preview: boolean
): ReasoningSettings {
  if (preview) {
    return {
      schemaVersion: 1,
      enabledFamilies: ['instruction_chain', 'daily_collection', 'unknown_start'],
      adventureEnabled: true,
    };
  }
  try {
    const candidate = cloudSettings ?? loadReasoningSettings(playerId, storage);
    return isReasoningSettings(candidate) ? candidate : defaultReasoningSettings();
  } catch {
    return defaultReasoningSettings();
  }
}

export const ReasoningPerformanceSection: React.FC<ReasoningPerformanceSectionProps> = ({
  playerId,
  child,
  settings,
  storage,
  preview,
}) => {
  const cloudSettings = settings ?? child?.reasoningSettings;
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const bump = () => setVersion((v) => v + 1);
    window.addEventListener('math-archer-reasoning-change', bump);
    window.addEventListener('storage', bump);
    return () => {
      window.removeEventListener('math-archer-reasoning-change', bump);
      window.removeEventListener('storage', bump);
    };
  }, []);

  const effectiveSettings = useMemo(
    () => resolveEffectiveSettings(playerId, cloudSettings, storage, preview),
    [playerId, cloudSettings, storage, preview, version]
  );

  const { attempts, pendingCount, conflictCount } = useMemo(
    () => readWorkspaceAttempts(playerId, storage, preview),
    [playerId, storage, preview, version]
  );

  const progress: ReasoningProgress = useMemo(() => {
    try {
      return computeReasoningProgress(playerId, attempts);
    } catch {
      return {
        schemaVersion: 1,
        playerId,
        startedMissions: 0,
        completedMissions: 0,
        assistedCompletions: 0,
        independentAttempts: 0,
        independentSuccesses: 0,
        families: {},
        objectives: {},
      };
    }
  }, [playerId, attempts]);

  const focus = useMemo(() => {
    const activeFamilies =
      effectiveSettings.enabledFamilies.length > 0
        ? effectiveSettings.enabledFamilies
        : MISSION_FAMILIES;
    return recommendFocus(progress, activeFamilies);
  }, [progress, effectiveSettings.enabledFamilies]);

  const objectiveEntries = useMemo(
    () =>
      Object.entries(progress.objectives).filter(
        (entry): entry is [MissionObjective, ReasoningEvidence] => Boolean(entry[1])
      ),
    [progress.objectives]
  );

  const unassistedCompletions = Math.max(
    0,
    progress.completedMissions - progress.assistedCompletions
  );
  const independentAccuracyPct =
    progress.independentAttempts > 0
      ? `${Math.round((progress.independentSuccesses / progress.independentAttempts) * 100)}%`
      : '—';
  const assistanceRatePct =
    progress.completedMissions > 0
      ? `${Math.round((progress.assistedCompletions / progress.completedMissions) * 100)}%`
      : '0%';

  return (
    <section
      className="dashboard-section"
      data-testid="reasoning-performance-section"
      style={{ marginBottom: 24 }}
    >
      <div className="section-header">
        <div>
          <h3>🧠 Vietnamese Reasoning Performance</h3>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
            Tracked separately from arithmetic fluency — measures Vietnamese comprehension,
            multi-step planning, and support fading.
          </p>
        </div>
        <span
          className={`badge ${
            effectiveSettings.enabledFamilies.length > 0 ? 'badge-strong' : 'trend-insufficient'
          }`}
          data-testid="reasoning-active-families-badge"
        >
          {effectiveSettings.enabledFamilies.length} / {MISSION_FAMILIES.length} Families Enabled
        </span>
      </div>

      <div className="metrics-row" data-testid="reasoning-metrics-row" style={{ marginTop: 16 }}>
        <div className="metric-card" data-testid="reasoning-completed-card">
          <span className="metric-label">Missions Completed</span>
          <span className="metric-val" data-testid="reasoning-completed-metric">
            {progress.completedMissions} / {progress.startedMissions}
          </span>
          <span className="metric-sub">
            {unassistedCompletions} unassisted • {progress.assistedCompletions} with help
          </span>
        </div>

        <div className="metric-card" data-testid="reasoning-independent-card">
          <span className="metric-label">Independent 1st-Answer</span>
          <span className="metric-val" data-testid="reasoning-independent-accuracy-metric">
            {independentAccuracyPct}
          </span>
          <span className="metric-sub">
            {progress.independentAttempts > 0
              ? `${progress.independentSuccesses} / ${progress.independentAttempts} independent first answers correct`
              : 'No independent attempts yet'}
          </span>
        </div>

        <div className="metric-card" data-testid="reasoning-assistance-card">
          <span className="metric-label">Scaffolded Rate</span>
          <span className="metric-val" data-testid="reasoning-assistance-metric">
            {assistanceRatePct}
          </span>
          <span className="metric-sub">
            {progress.assistedCompletions} mission{progress.assistedCompletions === 1 ? '' : 's'}{' '}
            used hints or step retry
          </span>
        </div>

        <div className="metric-card" data-testid="reasoning-mode-card">
          <span className="metric-label">Cadence &amp; Sync</span>
          <span className="metric-val" data-testid="reasoning-cadence-metric">
            {effectiveSettings.adventureEnabled ? 'Adventure + Training' : 'Training Only'}
          </span>
          <span className="metric-sub">
            {conflictCount > 0
              ? `${conflictCount} conflict(s) to review`
              : pendingCount > 0
                ? `${pendingCount} waiting to sync`
                : 'Evidence synced & separate from arithmetic'}
          </span>
        </div>
      </div>

      {focus && <ReasoningFocusCard focus={focus} />}

      <div style={{ marginTop: 20 }}>
        <h4 style={{ margin: '0 0 12px', fontSize: 15, color: '#1e293b' }}>
          📋 Mission Family Breakdown &amp; Support Fading
        </h4>
        <div className="skills-list" data-testid="reasoning-families-list">
          {MISSION_FAMILIES.map((family) => (
            <FamilyBreakdownRow
              key={family}
              family={family}
              enabled={effectiveSettings.enabledFamilies.includes(family)}
              counts={progress.families[family]}
              supportRec={recommendSupport(attempts, family)}
              stability={summarizeIndependentStability(attempts, family)}
            />
          ))}
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <div className="section-header" style={{ marginBottom: 12 }}>
          <h4 style={{ margin: 0, fontSize: 15, color: '#1e293b' }}>
            🔍 Observed Vietnamese Vocabulary &amp; Reasoning Steps
          </h4>
          <span style={{ fontSize: 12, color: '#64748b' }}>
            {objectiveEntries.length} relationship{objectiveEntries.length === 1 ? '' : 's'}{' '}
            observed
          </span>
        </div>
        {objectiveEntries.length === 0 ? (
          <p
            style={{ color: '#6b7280', fontSize: 14, margin: 0 }}
            data-testid="no-reasoning-objectives-msg"
          >
            No reasoning step observations recorded yet. Enable a mission family above and start a
            mission in Training (“Đọc đề, chọn bước”) or Adventure to see vocabulary and planning
            evidence.
          </p>
        ) : (
          <div className="weak-pairs-grid" data-testid="reasoning-objectives-grid">
            {objectiveEntries.map(([objective, evidence]) => (
              <ObjectiveEvidenceCard key={objective} objective={objective} evidence={evidence} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
