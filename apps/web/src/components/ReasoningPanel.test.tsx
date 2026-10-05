import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import {
  createMemoryStorage,
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
