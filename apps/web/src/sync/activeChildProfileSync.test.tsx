import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { App } from '../App';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ChildProfilePicker } from '../components/ChildProfilePicker';
import { MathArcherApiClient, type ChildPublicProfile } from '../api/client';

describe('Item 5: Active Child Profile Metadata & Selection Sync', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('reconciles active child state and localStorage when server profile metadata updates', async () => {
    let currentChildren: ChildPublicProfile[] = [
      {
        id: 'player-local',
        name: 'Alex',
        avatar: 'archer-1',
        grade: '1st Grade',
        hasPin: true,
        parentId: 'parent_default',
      },
    ];

    const mockApiClient = new MathArcherApiClient({
      fetchFn: async (url) => {
        const u = url.toString();
        if (u.includes('/api/auth/child/profiles')) {
          return new Response(JSON.stringify({ children: currentChildren }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        if (u.includes('/api/auth/child/login')) {
          return new Response(
            JSON.stringify({
              token: 'mock-token-alex',
              child: currentChildren[0],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
      },
    });

    // Test component to inspect activeChild
    let capturedAuth: ReturnType<typeof useAuth> | null = null;
    const TestConsumer = () => {
      capturedAuth = useAuth();
      return <div>Active: {capturedAuth.activeChild.name} ({capturedAuth.activeChild.avatar})</div>;
    };

    render(
      <AuthProvider apiClient={mockApiClient}>
        <TestConsumer />
      </AuthProvider>
    );

    // Initial state
    await waitFor(() => {
      expect(capturedAuth?.activeChild.name).toBe('Alex');
      expect(capturedAuth?.activeChild.avatar).toBe('archer-1');
    });

    // Simulate profile metadata updated on another device
    currentChildren = [
      {
        id: 'player-local',
        name: 'Alexander The Great',
        avatar: 'archer-fire',
        grade: '2nd Grade',
        hasPin: true,
        parentId: 'parent_default',
      },
    ];

    // Trigger refreshChildren
    await act(async () => {
      await capturedAuth?.refreshChildren();
    });

    // Verify activeChild was updated in state
    expect(capturedAuth!.activeChild.name).toBe('Alexander The Great');
    expect(capturedAuth!.activeChild.avatar).toBe('archer-fire');
    expect(capturedAuth!.activeChild.grade).toBe('2nd Grade');

    // Verify persisted to localStorage
    const stored = JSON.parse(localStorage.getItem('math_archer_active_child') || '{}');
    expect(stored.name).toBe('Alexander The Great');
    expect(stored.avatar).toBe('archer-fire');
    expect(stored.grade).toBe('2nd Grade');
  });

  it('updates active child header badge with new name and avatar emoji dynamically', async () => {
    let currentChildren: ChildPublicProfile[] = [
      {
        id: 'player-local',
        name: 'Alex',
        avatar: 'archer-1',
        grade: '1st Grade',
        hasPin: true,
        parentId: 'parent_default',
      },
    ];

    const mockApiClient = new MathArcherApiClient({
      fetchFn: async (url) => {
        const u = url.toString();
        if (u.includes('/api/auth/child/profiles')) {
          return new Response(JSON.stringify({ children: currentChildren }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        if (u.includes('/api/auth/child/login')) {
          return new Response(
            JSON.stringify({
              token: 'mock-token-alex',
              child: currentChildren[0],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        if (u.includes('/api/progress')) {
          return new Response(
            JSON.stringify({
              attempts: [],
              sessions: [],
              world: { activeAreaId: 'castle', unlockedAreaIds: ['castle'], completedSessions: 0 },
              rewards: {
                totalXp: 0,
                level: 1,
                unlockedCosmetics: ['bow-wood'],
                equippedCosmetics: { bow: 'bow-wood', quiver: 'quiver-leather' },
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
      },
    });

    render(<App apiClient={mockApiClient} />);

    // Initial badge check
    await waitFor(() => {
      expect(screen.getByTestId('current-player-badge')).toHaveTextContent(/Alex/i);
      expect(screen.getByTestId('current-player-avatar')).toHaveTextContent('🏹');
    });

    // Simulate remote update to ice archer
    currentChildren = [
      {
        id: 'player-local',
        name: 'Alex The Frost',
        avatar: 'archer-ice',
        grade: '3rd Grade',
        hasPin: true,
        parentId: 'parent_default',
      },
    ];

    // Trigger focus event which fires window focus listener in AuthContext
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
    });

    // Header badge updates with new name and avatar emoji
    await waitFor(() => {
      expect(screen.getByTestId('current-player-badge')).toHaveTextContent(/Alex The Frost/i);
      expect(screen.getByTestId('current-player-avatar')).toHaveTextContent('❄️');
    });
  });

  it('refreshes available children when opening ChildProfilePicker and applies changes', async () => {
    let serverChildren: ChildPublicProfile[] = [
      {
        id: 'player-local',
        name: 'Alex',
        avatar: 'archer-1',
        grade: '1st Grade',
        hasPin: true,
        parentId: 'parent_default',
      },
      {
        id: 'child_mia',
        name: 'Mia',
        avatar: 'archer-2',
        grade: '1st Grade',
        hasPin: false,
        parentId: 'parent_default',
      },
    ];

    const mockApiClient = new MathArcherApiClient({
      fetchFn: async (url, init) => {
        const u = url.toString();
        if (u.includes('/api/auth/child/profiles')) {
          return new Response(JSON.stringify({ children: serverChildren }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        if (u.includes('/api/auth/child/login')) {
          let reqChild = serverChildren[0];
          if (init?.body) {
            try {
              const b = JSON.parse(init.body as string);
              const found = serverChildren.find((c) => c.id === b.childId);
              if (found) reqChild = found;
            } catch {
              // Ignore malformed body
            }
          }
          return new Response(
            JSON.stringify({
              token: `mock-token-${reqChild.id}`,
              child: reqChild,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
      },
    });

    // Now update server children with a new child added on another device
    serverChildren = [
      {
        id: 'player-local',
        name: 'Alex Prime',
        avatar: 'archer-wind',
        grade: '2nd Grade',
        hasPin: true,
        parentId: 'parent_default',
      },
      {
        id: 'child_mia',
        name: 'Mia Solar',
        avatar: 'archer-fire',
        grade: '2nd Grade',
        hasPin: false,
        parentId: 'parent_default',
      },
    ];

    render(
      <AuthProvider apiClient={mockApiClient}>
        <ChildProfilePicker />
      </AuthProvider>
    );

    // Profile picker mounts and calls refreshChildren on mount
    await waitFor(() => {
      expect(screen.getByTestId('child-card-player-local')).toHaveTextContent('Alex Prime');
      expect(screen.getByTestId('child-card-child_mia')).toHaveTextContent('Mia Solar');
    });

    // Switching to Mia Solar (no PIN required) logs in and updates active child
    fireEvent.click(screen.getByTestId('child-card-child_mia'));

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem('math_archer_active_child') || '{}');
      expect(stored.id).toBe('child_mia');
      expect(stored.name).toBe('Mia Solar');
    });
  });

  it('gracefully falls back when active child was deleted on another device', async () => {
    // Initial active child is child_remotedelete
    const initialChild: ChildPublicProfile = {
      id: 'child_remotedelete',
      name: 'Temporary Child',
      avatar: 'archer-1',
      grade: '1st Grade',
      hasPin: false,
      parentId: 'parent_default',
    };
    localStorage.setItem('math_archer_active_child', JSON.stringify(initialChild));

    const remainingChildren: ChildPublicProfile[] = [
      {
        id: 'child_survivor',
        name: 'Survivor Child',
        avatar: 'archer-earth',
        grade: '4th Grade',
        hasPin: false,
        parentId: 'parent_default',
      },
    ];

    const mockApiClient = new MathArcherApiClient({
      fetchFn: async (url) => {
        const u = url.toString();
        if (u.includes('/api/auth/child/profiles')) {
          return new Response(JSON.stringify({ children: remainingChildren }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        if (u.includes('/api/auth/child/login')) {
          return new Response(
            JSON.stringify({ error: 'CHILD_NOT_FOUND', message: 'Child profile not found' }),
            { status: 404, headers: { 'Content-Type': 'application/json' } }
          );
        }
        return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
      },
    });

    let capturedAuth: ReturnType<typeof useAuth> | null = null;
    const TestConsumer = () => {
      capturedAuth = useAuth();
      return <div>Active: {capturedAuth.activeChild.name}</div>;
    };

    render(
      <AuthProvider apiClient={mockApiClient}>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(capturedAuth?.activeChild.id).toBe('child_survivor');
      expect(capturedAuth?.activeChild.name).toBe('Survivor Child');
    });

    const stored = JSON.parse(localStorage.getItem('math_archer_active_child') || '{}');
    expect(stored.id).toBe('child_survivor');
  });

  it('preserves local profile smoothly if server profile fetch fails (offline mode)', async () => {
    const mockApiClient = new MathArcherApiClient({
      fetchFn: async () => {
        throw new Error('Network error (offline)');
      },
    });

    let capturedAuth: ReturnType<typeof useAuth> | null = null;
    const TestConsumer = () => {
      capturedAuth = useAuth();
      return <div>Active: {capturedAuth.activeChild.name}</div>;
    };

    render(
      <AuthProvider apiClient={mockApiClient}>
        <TestConsumer />
      </AuthProvider>
    );

    // Active child remains default without error crashing
    await waitFor(() => {
      expect(capturedAuth?.activeChild.name).toBe('Alex');
    });

    // Explicit refresh also handles failure cleanly
    await act(async () => {
      await capturedAuth?.refreshChildren();
    });

    expect(capturedAuth!.activeChild.name).toBe('Alex');
  });
});
