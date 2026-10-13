import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MathArcherApiClient } from '../api/client';
import { AuthProvider, useAuth } from './AuthContext';
import { App } from '../App';
import { enqueueAttempt, getPendingQueue } from '../sync';
import {
  generateInstructionChain,
  loadLocalProgress,
  startMissionAttempt,
  type Attempt,
} from '@math-archer/learning-engine';
import { loadMissionWorkspace, queueMissionAttempt } from '../sync/missions';

const child = {
  id: 'child-test',
  name: 'Alex',
  avatar: 'archer-1',
  grade: '1st Grade',
  parentId: 'parent-test',
  hasPin: false,
};
const jwt = (expires: number) => `header.${btoa(JSON.stringify({ exp: expires }))}.signature`;
const freshToken = () => jwt(Math.floor(Date.now() / 1000) + 86400);
const attempt: Attempt = {
  questionId: 'offline',
  operation: 'add',
  left: 2,
  right: 3,
  answer: 5,
  selectedAnswer: 5,
  correct: true,
  responseTimeMs: 1000,
  skill: 'basic_addition',
  hintUsed: false,
  timestamp: '2026-10-13T10:00:00.000Z',
  playerId: child.id,
};

function AuthProbe() {
  const auth = useAuth();
  return <div data-testid="authenticated">{String(auth.isAuthenticated)}</div>;
}

function setup(token: string, hasPin = false) {
  localStorage.setItem('math_archer_active_child', JSON.stringify({ ...child, hasPin }));
  localStorage.setItem('math_archer_auth_token', token);
  const api = new MathArcherApiClient({ token });
  vi.spyOn(api, 'getChildProfiles').mockResolvedValue({ children: [{ ...child, hasPin }] });
  const login = vi.spyOn(api, 'loginChild').mockImplementation(async () => {
    const token = freshToken();
    api.setAuthToken(token);
    return { token, child: { ...child, hasPin } };
  });
  return { api, login };
}

describe('expired session recovery', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('replaces an expired startup token and resumes both durable queues', async () => {
    const { api, login } = setup(jwt(1));
    for (let i = 0; i < 50; i++) enqueueAttempt(child.id, { ...attempt, questionId: `q-${i}` });
    queueMissionAttempt(
      startMissionAttempt(
        generateInstructionChain({ seed: 42 }),
        child.id,
        'mission',
        attempt.timestamp
      )
    );
    const batch = vi.spyOn(api, 'submitAttemptsBatch').mockImplementation(async (_id, attempts) => {
      expect(api.getAuthToken()).toBe(freshToken());
      return { success: true, accepted: attempts.length };
    });
    vi.spyOn(api, 'listMissionAttempts').mockResolvedValue({
      schemaVersion: 1,
      attempts: [],
      nextCursor: null,
    });
    const save = vi.spyOn(api, 'saveMissionAttempt').mockImplementation(async (attempt) => {
      expect(api.getAuthToken()).toBe(freshToken());
      return { schemaVersion: 1, disposition: 'created', revision: 1, attempt };
    });
    vi.spyOn(api, 'getProgress').mockResolvedValue({
      profile: loadLocalProgress(child.id).profile,
      stats: loadLocalProgress(child.id).stats,
      currentSession: null,
      attempts: [],
    });
    expect(getPendingQueue(child.id)).toHaveLength(50);
    expect(loadMissionWorkspace(child.id).items[0].pending).toBe(true);
    render(<App apiClient={api} />);
    await waitFor(() =>
      expect(screen.queryByTestId('sync-sign-in-prompt')).not.toBeInTheDocument()
    );
    expect(login).toHaveBeenCalledWith(child.id, undefined);
    await waitFor(() => {
      expect(batch).toHaveBeenCalled();
      expect(save).toHaveBeenCalled();
      expect(getPendingQueue(child.id)).toHaveLength(0);
      expect(loadMissionWorkspace(child.id).items[0].pending).toBe(false);
    });
  });

  it('requires the private PIN and preserves queued work instead of bypassing login', async () => {
    const { api, login } = setup(jwt(1), true);
    enqueueAttempt(child.id, attempt);
    render(<App apiClient={api} />);
    expect(screen.getByTestId('sync-sign-in-prompt')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sign in to sync' }));
    expect(screen.getByTestId('child-profile-picker')).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
    expect(api.getAuthToken()).toBeNull();
    expect(getPendingQueue(child.id)).toHaveLength(1);
  });

  it('expires a token while the tab remains open', async () => {
    vi.useFakeTimers();
    const { api, login } = setup(jwt(Math.floor(Date.now() / 1000) + 2), true);
    render(
      <AuthProvider apiClient={api}>
        <AuthProbe />
      </AuthProvider>
    );
    expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2001);
    });
    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    expect(api.getAuthToken()).toBeNull();
    expect(login).not.toHaveBeenCalled();
  });

  it('retries failed offline recovery on reconnect', async () => {
    const { api, login } = setup(jwt(1));
    login.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    render(
      <AuthProvider apiClient={api}>
        <AuthProbe />
      </AuthProvider>
    );
    await waitFor(() => expect(login).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    fireEvent(window, new Event('online'));
    await waitFor(() => expect(screen.getByTestId('authenticated')).toHaveTextContent('true'));
    expect(login).toHaveBeenCalledTimes(2);
  });
});
