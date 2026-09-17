import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GameScreen } from '../components/GameScreen';
import { SyncManager } from '../sync/SyncManager';
import { clearQueue, getPendingQueue } from '../sync/queue';
import { MathArcherApiClient } from '../api/client';
import type { Attempt, SessionStorageAdapter } from '@math-archer/learning-engine';

/**
 * Task 8.3 — Offline support
 *
 * Requirements:
 * - Cache app shell, game assets, and learning engine.
 * - Queue attempts locally.
 *
 * Done When:
 * "A previously loaded game can complete a session without network connectivity
 * and synchronizes later."
 */

describe('Task 8.3 — Offline Support & Synchronization', () => {
  const playerId = 'offline-player-test';
  let memoryStorage: Map<string, string>;
  let storage: SessionStorageAdapter;

  beforeEach(() => {
    localStorage.clear();
    memoryStorage = new Map<string, string>();
    storage = {
      getItem: (k: string) => memoryStorage.get(k) ?? null,
      setItem: (k: string, v: string) => memoryStorage.set(k, v),
      removeItem: (k: string) => memoryStorage.delete(k),
    };
    clearQueue(playerId, storage);
  });

  it('completes a full game session offline, stores queued attempts locally, and synchronizes when reconnected', async () => {
    const syncedBatches: Attempt[][] = [];

    // Mock API client that records batch submissions
    const mockApiClient = new MathArcherApiClient({
      fetchFn: async (_url, init) => {
        const body = JSON.parse((init?.body as string) || '{}');
        syncedBatches.push(body.attempts);
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

    // Initialize SyncManager in offline mode
    const syncManager = new SyncManager({
      playerId,
      apiClient: mockApiClient,
      storage,
      initialOnline: false,
    });

    expect(syncManager.isOnline).toBe(false);
    expect(syncManager.getState().status).toBe('offline');

    // Render GameScreen configured for 2 arrows with 0ms transition delay
    render(
      <GameScreen
        playerId={playerId}
        maxArrows={2}
        autoAdvanceDelayMs={0}
        storage={storage}
        syncManager={syncManager}
      />
    );

    // 1. App shell and local learning engine initialize question without network
    expect(screen.getByTestId('question-expression')).toBeInTheDocument();
    expect(screen.getByTestId('cloud-sync-status')).toHaveTextContent(/offline/i);

    // 2. Answer Question 1 while offline
    const firstChoice = screen.getByTestId('choice-fire');
    fireEvent.click(firstChoice);

    // Verify attempt is enqueued in local offline storage
    const queueAfter1 = getPendingQueue(playerId, storage);
    expect(queueAfter1).toHaveLength(1);
    expect(queueAfter1[0].status).toBe('pending');
    expect(syncedBatches).toHaveLength(0); // Network call was not made/queued locally

    // 3. Answer Question 2 while offline (completing the session)
    const secondChoice = screen.getByTestId('choice-ice');
    fireEvent.click(secondChoice);

    // Verify second attempt is enqueued
    const queueAfter2 = getPendingQueue(playerId, storage);
    expect(queueAfter2).toHaveLength(2);
    expect(queueAfter2[1].status).toBe('pending');

    // 4. Session completes fully offline with Daily Practice Complete screen
    await waitFor(() => {
      expect(screen.getByTestId('session-complete')).toBeInTheDocument();
    });
    expect(screen.getByText(/Daily Practice Complete!/i)).toBeInTheDocument();
    expect(screen.getByTestId('session-complete-notice')).toBeInTheDocument();

    // Zero attempts were lost during offline play
    expect(getPendingQueue(playerId, storage)).toHaveLength(2);
    expect(syncedBatches).toHaveLength(0);

    // 5. Network connectivity is restored later (device goes online)
    syncManager.setOnline(true);
    expect(syncManager.isOnline).toBe(true);

    // Automatically or via flushQueue, pending attempts synchronize to the server
    await syncManager.flushQueue();

    // 6. Server accepted the batch and local queue is marked synced
    await waitFor(() => {
      expect(syncedBatches).toHaveLength(1);
      expect(syncedBatches[0]).toHaveLength(2);
    });

    const pendingQueueAfterSync = getPendingQueue(playerId, storage);
    expect(pendingQueueAfterSync).toHaveLength(0);
    expect(syncManager.getState().status).toBe('synced');
  });
});
