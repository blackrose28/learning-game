import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import {
  createMemoryStorage,
  generateDailyCollection,
  generateInstructionChain,
  recordMissionResponse,
  startMissionAttempt,
} from '@math-archer/learning-engine';
import { ReasoningPanel } from './ReasoningPanel';
import { loadReasoningSettings } from '../reasoningPreferences';
import { MathArcherApiClient } from '../api/client';
import { loadMissionWorkspace, queueMissionAttempt, syncMissionAttempts } from '../sync/missions';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('parent reasoning controls and recovery', () => {
  it('saves opt-in only after a confirmed cloud update and leaves failures unchanged', async () => {
    const storage = createMemoryStorage();
    const update = vi.fn(async (reasoningSettings) => ({
      id: 'child',
      name: 'Child',
      avatar: 'archer-1',
      grade: '1',
      hasPin: false,
      reasoningSettings,
    }));
    render(
      <ReasoningPanel
        playerId="child"
        storage={storage}
        update={update}
        preview={false}
        busy={false}
      />
    );
    const toggle = screen.getByRole('switch', { name: 'Instruction chains' });
    expect(toggle).not.toBeChecked();
    fireEvent.click(toggle);
    await waitFor(() => expect(toggle).toBeChecked());
    expect(loadReasoningSettings('child', storage).enabledFamilies).toEqual(['instruction_chain']);
    update.mockRejectedValueOnce(new Error('Save failed'));
    fireEvent.click(toggle);
    await screen.findByText('Save failed');
    expect(toggle).toBeChecked();
    expect(loadReasoningSettings('other', storage).enabledFamilies).toEqual([]);
  });

  it('toggles each family independently, keeping the enabled set in a stable order', async () => {
    const storage = createMemoryStorage();
    const update = vi.fn(async (reasoningSettings) => ({
      id: 'child',
      name: 'Child',
      avatar: 'archer-1',
      grade: '1',
      hasPin: false,
      reasoningSettings,
    }));
    render(
      <ReasoningPanel
        playerId="child"
        storage={storage}
        update={update}
        preview={false}
        busy={false}
      />
    );
    const unknown = screen.getByRole('switch', { name: 'Unknown starting amount' });
    const daily = screen.getByRole('switch', { name: 'Daily collection' });
    fireEvent.click(unknown);
    await waitFor(() => expect(unknown).toBeChecked());
    fireEvent.click(daily);
    await waitFor(() => expect(daily).toBeChecked());
    expect(loadReasoningSettings('child', storage).enabledFamilies).toEqual([
      'daily_collection',
      'unknown_start',
    ]);
    expect(screen.getByRole('switch', { name: 'Instruction chains' })).not.toBeChecked();
    fireEvent.click(unknown);
    await waitFor(() => expect(unknown).not.toBeChecked());
    expect(loadReasoningSettings('child', storage).enabledFamilies).toEqual(['daily_collection']);
  });

  it('saves the Adventure switch only after the server confirms it and keeps it across family changes', async () => {
    const storage = createMemoryStorage();
    const update = vi.fn(async (reasoningSettings) => ({
      id: 'child',
      name: 'Child',
      avatar: 'archer-1',
      grade: '1',
      hasPin: false,
      reasoningSettings,
    }));
    render(
      <ReasoningPanel
        playerId="child"
        storage={storage}
        update={update}
        preview={false}
        busy={false}
      />
    );
    const adventure = screen.getByRole('switch', { name: 'Include in Adventure' });
    fireEvent.click(adventure);
    await waitFor(() => expect(adventure).toBeChecked());
    expect(loadReasoningSettings('child', storage).adventureEnabled).toBe(true);
    const daily = screen.getByRole('switch', { name: 'Daily collection' });
    fireEvent.click(daily);
    await waitFor(() => expect(daily).toBeChecked());
    expect(loadReasoningSettings('child', storage)).toEqual({
      schemaVersion: 1,
      enabledFamilies: ['daily_collection'],
      adventureEnabled: true,
    });
    update.mockRejectedValueOnce(new Error('Save failed'));
    fireEvent.click(adventure);
    await screen.findByText('Save failed');
    expect(adventure).toBeChecked();
    fireEvent.click(adventure);
    await waitFor(() => expect(adventure).not.toBeChecked());
    expect(loadReasoningSettings('child', storage).adventureEnabled).toBeUndefined();
  });

  it('reports family counts and above-20 calculation evidence separately', async () => {
    const storage = createMemoryStorage();
    const time = '2026-10-05T10:00:00.000Z';
    const mission = generateDailyCollection({
      seed: 1,
      parameters: { name: 'Hải', object: 'kun_cards', start: 30, perDay: 2, days: 3 },
    });
    let attempt = startMissionAttempt(mission, 'child', 'daily', time);
    for (const step of mission.steps) {
      attempt = recordMissionResponse(attempt, {
        eventId: step.id,
        stepId: step.id,
        choiceId: step.correctChoiceId,
        timestamp: time,
        responseTimeMs: 1,
      });
    }
    queueMissionAttempt(attempt, storage);
    render(<ReasoningPanel playerId="child" storage={storage} preview={false} busy={false} />);
    expect(
      await screen.findByText(/Daily collection: 1\/1 missions completed; 0 with help/)
    ).toBeVisible();
    expect(screen.getByText(/Guided calculation above 20: 1\/1/)).toBeVisible();
    expect(screen.getByText(/Finding the starting amount: 1\/1/)).toBeVisible();
    expect(screen.queryByText(/Instruction chains:/)).not.toBeInTheDocument();
  });

  it('disables preview edits and rejects a server that ignores the preference', async () => {
    const storage = createMemoryStorage();
    const update = vi.fn(async () => ({
      id: 'child',
      name: 'Child',
      avatar: 'archer-1',
      grade: '1',
      hasPin: false,
    }));
    const view = render(
      <ReasoningPanel
        playerId="child"
        storage={storage}
        update={update}
        preview={true}
        busy={false}
      />
    );
    expect(screen.getByRole('switch', { name: 'Instruction chains' })).toBeDisabled();
    view.rerender(
      <ReasoningPanel
        playerId="child"
        storage={storage}
        update={update}
        preview={false}
        busy={false}
      />
    );
    fireEvent.click(screen.getByRole('switch', { name: 'Instruction chains' }));
    await screen.findByText(/server has not saved/);
    expect(screen.getByRole('switch', { name: 'Instruction chains' })).not.toBeChecked();
    expect(loadReasoningSettings('child', storage).enabledFamilies).toEqual([]);
  });

  it('shows conflicting evidence and archives local responses when the parent selects cloud history', async () => {
    const storage = createMemoryStorage();
    const time = '2026-10-05T10:00:00.000Z';
    const mission = generateInstructionChain({ seed: 42 });
    const first = startMissionAttempt(mission, 'child', 'mission', time);
    const response = (choiceId: string) =>
      recordMissionResponse(first, {
        eventId: 'answer',
        stepId: 'successor',
        choiceId,
        timestamp: time,
        responseTimeMs: 1,
      });
    const cloud = response(mission.steps[0].correctChoiceId);
    const local = response(
      mission.steps[0].choices.find((choice) => choice.id !== mission.steps[0].correctChoiceId)!.id
    );
    queueMissionAttempt(local, storage);
    const api = new MathArcherApiClient({ token: 'token' });
    vi.spyOn(api, 'listMissionAttempts').mockResolvedValue({
      schemaVersion: 1,
      attempts: [{ attempt: cloud, revision: 2 }],
      nextCursor: null,
    });
    await syncMissionAttempts('child', api, storage);
    render(<ReasoningPanel playerId="child" storage={storage} preview={false} busy={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Use cloud history' }));
    await screen.findByText('Using cloud history. The local history is kept for recovery.');
    expect(loadMissionWorkspace('child', storage).recovery[0].local).toEqual(local);
    expect(screen.queryByRole('button', { name: 'Use cloud history' })).not.toBeInTheDocument();
  });
});
