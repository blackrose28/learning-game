import React, { useEffect, useState } from 'react';
import {
  defaultReasoningSettings,
  isReasoningSettings,
  MISSION_FAMILIES,
  type MissionFamily,
  type MissionObjective,
  type ReasoningSettings,
  type SessionStorageAdapter,
  type ReasoningProgress,
} from '@math-archer/learning-engine';
import type { ChildPublicProfile, MathArcherApiClient } from '../api/client';
import { loadReasoningSettings, saveReasoningSettings } from '../reasoningPreferences';
import {
  loadMissionWorkspace,
  loadReasoningProgress,
  syncMissionAttempts,
  useCloudMissionHistory,
  type MissionSyncItem,
} from '../sync/missions';

interface ReasoningPanelProps {
  playerId: string;
  settings?: ReasoningSettings;
  storage: SessionStorageAdapter;
  api?: MathArcherApiClient;
  update?: (settings: ReasoningSettings) => Promise<ChildPublicProfile>;
  preview: boolean;
  busy: boolean;
}

const labels: Record<MissionObjective, string> = {
  successor_vocabulary: '“Số liền sau”',
  predecessor_vocabulary: '“Số liền trước”',
  greater_by_vocabulary: '“Lớn hơn … đơn vị”',
  less_by_vocabulary: '“Bé hơn … đơn vị”',
  difference_vocabulary: '“Hiệu”',
  sum_vocabulary: '“Tổng”',
  step_order: 'Choosing the next step',
  starting_amount: 'Finding the starting amount',
  repeated_change: 'Repeated daily change',
  choose_operation: 'Choosing the calculation',
  dozen_vocabulary: '“Chục” (dozens)',
  find_unknown: 'Finding what is asked (“lúc đầu”)',
  reverse_changes: 'Reversing the changes',
  term_position: 'Term position (“số thứ …”)',
  gap_observation: 'Finding the gap between terms',
  extend_rule: 'Extending the growing-gap rule',
  place_value: 'Place value (tens and units)',
  choose_cards: 'Choosing which card to leave out',
  tens_placement: 'Choosing the tens cards',
  maximize_sum: 'Arranging cards for the largest total',
  calculation: 'Guided calculation up to 20',
  calculation_over_20: 'Guided calculation above 20',
};

const families: Record<MissionFamily, { name: string; description: string }> = {
  instruction_chain: {
    name: 'Instruction chains',
    description: 'Understand “số liền sau”, “hiệu”, and the order of steps.',
  },
  daily_collection: {
    name: 'Daily collection',
    description: 'Start amount, the same change each day, and repeated addition.',
  },
  unknown_start: {
    name: 'Unknown starting amount',
    description:
      'Use “1 chục” and “còn lại” to work backwards, undoing both gains and losses, to “lúc đầu”.',
  },
  growing_gap_sequence: {
    name: 'Growing-gap sequences',
    description: 'Number the terms, find the gaps, and extend a rule whose gaps grow.',
  },
  max_sum_digit_cards: {
    name: 'Digit-card sums',
    description: 'Place digit cards in tens and units slots to make the largest total.',
  },
};

export const ReasoningPanel: React.FC<ReasoningPanelProps> = ({
  playerId,
  settings: cloudSettings,
  storage,
  api,
  update,
  preview,
  busy,
}) => {
  const [settings, setSettings] = useState(defaultReasoningSettings);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<ReasoningProgress | null>(null);
  const [conflicts, setConflicts] = useState<MissionSyncItem[]>([]);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    try {
      const next = cloudSettings ?? loadReasoningSettings(playerId, storage);
      if (!isReasoningSettings(next)) throw new Error('Unsupported reasoning preferences');
      setSettings(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load reasoning preferences.');
    }
  }, [cloudSettings, playerId, storage]);

  useEffect(() => {
    const refresh = () => {
      if (preview) {
        setProgress(null);
        setConflicts([]);
        setPending(0);
        return;
      }
      try {
        const workspace = loadMissionWorkspace(playerId, storage);
        setProgress(loadReasoningProgress(playerId, storage));
        setConflicts(workspace.items.filter((item) => item.conflict));
        setPending(workspace.items.filter((item) => item.pending).length);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load reasoning progress.');
      }
    };
    refresh();
    window.addEventListener('math-archer-reasoning-change', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('math-archer-reasoning-change', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [playerId, preview, storage]);

  const withSettings = (enabledFamilies: MissionFamily[], adventureEnabled: boolean) => {
    const next: ReasoningSettings = { schemaVersion: 1, enabledFamilies };
    if (adventureEnabled) next.adventureEnabled = true;
    return next;
  };

  const toggle = (family: MissionFamily) =>
    save(
      withSettings(
        MISSION_FAMILIES.filter((item) =>
          item === family
            ? !settings.enabledFamilies.includes(item)
            : settings.enabledFamilies.includes(item)
        ),
        settings.adventureEnabled === true
      )
    );

  const toggleAdventure = () =>
    save(withSettings(settings.enabledFamilies, settings.adventureEnabled !== true));

  const save = async (next: ReasoningSettings) => {
    if (!update) return;
    setSaving(true);
    setFeedback(null);
    try {
      const child = await update(next);
      if (
        !isReasoningSettings(child.reasoningSettings) ||
        JSON.stringify(child.reasoningSettings) !== JSON.stringify(next)
      ) {
        throw new Error(
          'The server has not saved this reasoning preference. Please try again after updating.'
        );
      }
      saveReasoningSettings(playerId, next, storage);
      setSettings(next);
      setFeedback('Reasoning preference saved.');
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Unable to save reasoning preference.');
    } finally {
      setSaving(false);
    }
  };

  const sync = async () => {
    if (!api) return;
    setSaving(true);
    const result = await syncMissionAttempts(playerId, api, storage);
    setFeedback(
      result.error ??
        (result.status === 'conflict'
          ? 'Review the conflicting histories below.'
          : result.status === 'offline'
            ? 'Progress stays saved on this device until you are online.'
            : 'Reasoning progress refreshed.')
    );
    setSaving(false);
  };

  return (
    <section className="practice-skills-panel" aria-labelledby="reasoning-practice-title">
      <h2 id="reasoning-practice-title">Reasoning practice</h2>
      <p>Practice understanding Vietnamese questions and choosing solution steps.</p>
      <p>
        When enabled, open Play → Training → “Đọc đề, chọn bước”. Choose guided steps or an
        independent answer before each mission. With several types enabled, choose the type each
        time.
      </p>
      {MISSION_FAMILIES.map((family) => (
        <label className="practice-skill-row" key={family}>
          <span>
            <strong>{families[family].name}</strong>
            <small>{families[family].description}</small>
          </span>
          <input
            type="checkbox"
            role="switch"
            aria-label={families[family].name}
            checked={settings.enabledFamilies.includes(family)}
            disabled={preview || busy || saving || !update || !!error}
            onChange={() => void toggle(family)}
          />
        </label>
      ))}
      <label className="practice-skill-row">
        <span>
          <strong>Include in Adventure</strong>
          <small>
            Occasionally offer one reasoning mission (at most one per five arrows) from the types
            enabled above. Training is unchanged.
          </small>
        </span>
        <input
          type="checkbox"
          role="switch"
          aria-label="Include in Adventure"
          checked={settings.adventureEnabled === true}
          disabled={preview || busy || saving || !update || !!error}
          onChange={() => void toggleAdventure()}
        />
      </label>
      {preview ? (
        <p>Switch to real data to change reasoning practice.</p>
      ) : (
        <>
          <p>
            {progress?.completedMissions ?? 0} missions completed;{' '}
            {progress?.assistedCompletions ?? 0} with help.
          </p>
          <p>
            {progress?.independentAttempts
              ? `${progress.independentSuccesses}/${progress.independentAttempts} independent first answers correct.`
              : 'No independent attempts yet.'}
          </p>
          {progress &&
            MISSION_FAMILIES.map((family) => {
              const counts = progress.families[family];
              return (
                counts && (
                  <p key={family}>
                    {families[family].name}: {counts.completedMissions}/{counts.startedMissions}{' '}
                    missions completed; {counts.assistedCompletions} with help;{' '}
                    {counts.independentAttempts
                      ? `${counts.independentSuccesses}/${counts.independentAttempts} independent first answers correct.`
                      : 'no independent attempts yet.'}
                  </p>
                )
              );
            })}
          {progress &&
            Object.entries(progress.objectives).map(
              ([objective, evidence]) =>
                evidence && (
                  <p key={objective}>
                    {labels[objective as keyof typeof labels]}: {evidence.firstCorrect}/
                    {evidence.observations} first answers correct; {evidence.unassistedCorrect}/
                    {evidence.unassistedObservations} without hints or earlier correction.
                  </p>
                )
            )}
          {pending > 0 && <p>{pending} mission histories waiting to sync.</p>}
          {api && (
            <button type="button" disabled={saving || busy || !!error} onClick={() => void sync()}>
              Refresh reasoning progress
            </button>
          )}
          {conflicts.map((item) => (
            <div key={item.local.id}>
              <p>Different histories were saved for: {item.local.mission.prompt}</p>
              <p>
                This device has {item.local.responses.length} responses; cloud has{' '}
                {item.server?.attempt.responses.length ?? 0}. Your local history stays saved for
                recovery.
              </p>
              <button
                type="button"
                disabled={saving || busy}
                onClick={() => {
                  try {
                    useCloudMissionHistory(playerId, item.local.id, storage);
                    setFeedback('Using cloud history. The local history is kept for recovery.');
                  } catch (err) {
                    setFeedback(
                      err instanceof Error ? err.message : 'Unable to restore cloud history.'
                    );
                  }
                }}
              >
                Use cloud history
              </button>
            </div>
          ))}
        </>
      )}
      {error && <p role="alert">{error}</p>}
      {feedback && <p role="status">{feedback}</p>}
    </section>
  );
};
