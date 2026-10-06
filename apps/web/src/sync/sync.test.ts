import { describe, it, expect, beforeEach } from 'vitest';
import { SyncManager } from './SyncManager';
import { loadQueue, clearQueue, getPendingQueue } from './queue';
import { MathArcherApiClient } from '../api/client';
import type { Attempt, SessionStorageAdapter } from '@math-archer/learning-engine';

describe('Task 6.4 — Synchronize the client (SyncManager & Queue)', () => {
  let memoryStorage: Map<string, string>;
  let storage: SessionStorageAdapter;
  const playerId = 'test-child-sync';

  beforeEach(() => {
    memoryStorage = new Map<string, string>();
    storage = {
      getItem: (k: string) => memoryStorage.get(k) ?? null,
      setItem: (k: string, v: string) => memoryStorage.set(k, v),
      removeItem: (k: string) => memoryStorage.delete(k),
    };
    clearQueue(playerId, storage);
  });

  const createSampleAttempt = (id: string, correct = true): Attempt => ({
    questionId: id,
    operation: 'add',
    left: 7,
    right: 5,
    answer: 12,
    selectedAnswer: correct ? 12 : 11,
    correct,
    responseTimeMs: 2100,
    skill: 'cross_10_addition',
    hintUsed: false,
    mode: 'adventure',
    timestamp: new Date().toISOString(),
    playerId,
  });

  it('normal online flow: answer -> saved locally -> queued -> sent to API -> server accepts -> marked synchronized', async () => {
    const sentBatches: Attempt[][] = [];

    // Mock API client that accepts attempts
    const mockApiClient = new MathArcherApiClient({
      fetchFn: async (_url, init) => {
        const body = JSON.parse((init?.body as string) || '{}');
        sentBatches.push(body.attempts);
        return new Response(
          JSON.stringify({
            success: true,
            accepted: body.attempts.length,
            session: { arrowsUsed: body.attempts.length },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      },
    });

    const syncManager = new SyncManager({
      playerId,
      apiClient: mockApiClient,
      storage,
      initialOnline: true,
    });

    expect(syncManager.getState().status).toBe('synced');
    expect(syncManager.getState().pendingCount).toBe(0);

    // Child answers a question
    const attempt1 = createSampleAttempt('att-1', true);
    await syncManager.processAttempt(attempt1);

    // Verify sent to API
    expect(sentBatches.length).toBe(1);
    expect(sentBatches[0][0].questionId).toBe('att-1');

    // Verify marked synchronized
    const queue = loadQueue(playerId, storage);
    expect(queue.length).toBe(1);
    expect(queue[0].status).toBe('synced');
    expect(queue[0].attempt.questionId).toBe('att-1');
    expect(syncManager.getState().status).toBe('synced');
    expect(syncManager.getState().pendingCount).toBe(0);

    syncManager.destroy();
  });

  it('offline flow: turning network off during session does not lose completed attempts', async () => {
    let networkAvailable = false;
    const sentBatches: Attempt[][] = [];

    const mockApiClient = new MathArcherApiClient({
      fetchFn: async (_url, init) => {
        if (!networkAvailable) {
          throw new TypeError('Failed to fetch (Network offline)');
        }
        const body = JSON.parse((init?.body as string) || '{}');
        sentBatches.push(body.attempts);
        return new Response(
          JSON.stringify({
            success: true,
            accepted: body.attempts.length,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      },
    });

    const syncManager = new SyncManager({
      playerId,
      apiClient: mockApiClient,
      storage,
      initialOnline: false, // Network is offline
    });

    expect(syncManager.getState().status).toBe('offline');

    // Child plays 5 questions completely offline
    const offlineAttempts: Attempt[] = [];
    for (let i = 1; i <= 5; i++) {
      const att = createSampleAttempt(`offline-q-${i}`, i % 2 === 0);
      offlineAttempts.push(att);
      await syncManager.processAttempt(att);
    }

    // Zero requests reached the server while offline
    expect(sentBatches.length).toBe(0);

    // CRITICAL: Verify NO ATTEMPTS LOST!
    // All 5 attempts are securely saved in local persistent storage queue
    const savedQueue = loadQueue(playerId, storage);
    expect(savedQueue.length).toBe(5);

    const pendingQueue = getPendingQueue(playerId, storage);
    expect(pendingQueue.length).toBe(5);
    for (let i = 0; i < 5; i++) {
      expect(savedQueue[i].attempt.questionId).toBe(`offline-q-${i + 1}`);
      expect(savedQueue[i].status).toBe('pending');
    }

    expect(syncManager.getState().status).toBe('offline');
    expect(syncManager.getState().pendingCount).toBe(5);

    // Now network is restored!
    networkAvailable = true;
    syncManager.setOnline(true);

    // Allow async flushQueue to execute
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Server has now received all 5 attempts in a batch
    expect(sentBatches.length).toBe(1);
    expect(sentBatches[0].length).toBe(5);
    expect(sentBatches[0].map((a) => a.questionId)).toEqual([
      'offline-q-1',
      'offline-q-2',
      'offline-q-3',
      'offline-q-4',
      'offline-q-5',
    ]);

    // All items in queue are now marked 'synced'
    const finalQueue = loadQueue(playerId, storage);
    expect(finalQueue.every((item) => item.status === 'synced')).toBe(true);
    expect(syncManager.getState().status).toBe('synced');
    expect(syncManager.getState().pendingCount).toBe(0);

    syncManager.destroy();
  });

  it('notifies subscribers immediately on status transitions', async () => {
    const mockApiClient = new MathArcherApiClient({
      fetchFn: async () =>
        new Response(JSON.stringify({ success: true, accepted: 1 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    });

    const syncManager = new SyncManager({
      playerId,
      apiClient: mockApiClient,
      storage,
      initialOnline: true,
    });

    const statusHistory: string[] = [];
    syncManager.subscribe((state) => {
      statusHistory.push(state.status);
    });

    // Go offline
    syncManager.setOnline(false);
    expect(statusHistory[statusHistory.length - 1]).toBe('offline');

    // Back online
    syncManager.setOnline(true);
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(statusHistory[statusHistory.length - 1]).toBe('synced');

    syncManager.destroy();
  });

  it('sends a large backlog in chunks and drops server-rejected items from the retry queue', async () => {
    const sentSizes: number[] = [];
    const mockApiClient = new MathArcherApiClient({
      fetchFn: async (_url, init) => {
        const body = JSON.parse((init?.body as string) || '{}');
        sentSizes.push(body.attempts.length);
        // Server refuses the first item of every chunk for good
        return new Response(
          JSON.stringify({
            success: true,
            accepted: body.attempts.length - 1,
            rejected: [{ index: 0, code: 'DAILY_LIMIT_EXCEEDED' }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      },
    });

    const syncManager = new SyncManager({
      playerId,
      apiClient: mockApiClient,
      storage,
      initialOnline: false,
    });
    for (let i = 0; i < 110; i++) {
      await syncManager.processAttempt(createSampleAttempt(`backlog-${i}`));
    }
    expect(getPendingQueue(playerId, storage)).toHaveLength(110);

    syncManager.setOnline(true);
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(sentSizes).toEqual([25, 25, 25, 25, 10]);
    expect(getPendingQueue(playerId, storage)).toHaveLength(0);
    const queue = loadQueue(playerId, storage);
    expect(queue.filter((q) => q.status === 'rejected')).toHaveLength(5);
    expect(queue.filter((q) => q.status === 'synced')).toHaveLength(105);

    syncManager.destroy();
  });

  it('isolates one poisoned item when an older server 403s the whole request', async () => {
    const mockApiClient = new MathArcherApiClient({
      fetchFn: async (_url, init) => {
        const body = JSON.parse((init?.body as string) || '{}');
        const poisoned = body.attempts.some((a: Attempt) => a.questionId === 'poison');
        return poisoned
          ? new Response(JSON.stringify({ error: 'DAILY_LIMIT_EXCEEDED', message: 'limit' }), {
              status: 403,
              headers: { 'Content-Type': 'application/json' },
            })
          : new Response(JSON.stringify({ success: true, accepted: body.attempts.length }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            });
      },
    });

    const syncManager = new SyncManager({
      playerId,
      apiClient: mockApiClient,
      storage,
      initialOnline: false,
    });
    for (const id of ['a', 'b', 'poison', 'c']) {
      await syncManager.processAttempt(createSampleAttempt(id));
    }

    syncManager.setOnline(true);
    await new Promise((resolve) => setTimeout(resolve, 20));

    const byId = new Map(loadQueue(playerId, storage).map((q) => [q.attempt.questionId, q.status]));
    expect(byId.get('poison')).toBe('rejected');
    expect(['a', 'b', 'c'].map((id) => byId.get(id))).toEqual(['synced', 'synced', 'synced']);
    expect(getPendingQueue(playerId, storage)).toHaveLength(0);

    syncManager.destroy();
  });

  it('handles server daily limit response gracefully', async () => {
    const mockApiClient = new MathArcherApiClient({
      fetchFn: async () =>
        new Response(
          JSON.stringify({
            error: 'DAILY_LIMIT_EXCEEDED',
            message: 'Daily limit of 50 arrows reached',
          }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        ),
    });

    const syncManager = new SyncManager({
      playerId,
      apiClient: mockApiClient,
      storage,
      initialOnline: true,
    });

    const att = createSampleAttempt('att-exceeded');
    await syncManager.processAttempt(att);

    const state = syncManager.getState();
    expect(state.status).toBe('error');
    expect(state.lastError).toContain('Daily arrow limit (50) reached on server');

    syncManager.destroy();
  });
});
