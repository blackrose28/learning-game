import React, { useEffect, useState } from 'react';
import {
  defaultReasoningSettings,
  isReasoningSettings,
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

const labels = {
  successor_vocabulary: '“Số liền sau”',
  difference_vocabulary: '“Hiệu”',
  step_order: 'Choosing the next step',
  calculation: 'Guided calculation',
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

  const toggle = async () => {
    if (!update) return;
    const next: ReasoningSettings = {
      schemaVersion: 1,
      enabledFamilies: settings.enabledFamilies.length ? [] : ['instruction_chain'],
    };
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
      <label className="practice-skill-row">
        <span>
          <strong>Instruction chains</strong>
          <small>Understand “số liền sau”, “hiệu”, and the order of steps.</small>
        </span>
        <input
          type="checkbox"
          role="switch"
          aria-label="Instruction chains"
          checked={settings.enabledFamilies.includes('instruction_chain')}
          disabled={preview || busy || saving || !update || !!error}
          onChange={() => void toggle()}
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
