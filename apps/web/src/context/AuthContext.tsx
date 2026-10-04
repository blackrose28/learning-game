import type { Skill } from '@math-archer/learning-engine';
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  MathArcherApiClient,
  ApiError,
  type ChildPublicProfile,
  type ParentPublic,
} from '../api/client';
import {
  loadQueuedPinChange,
  enqueuePinChange,
  clearQueuedPinChange,
  flushQueuedPinChange,
} from '../sync';

export interface AuthContextValue {
  currentMode: 'child' | 'parent';
  activeChild: ChildPublicProfile;
  parentUser: ParentPublic | null;
  parentPin: string;
  isParentUnlocked: boolean;
  availableChildren: ChildPublicProfile[];
  apiClient: MathArcherApiClient;
  authToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  hasPendingPinSync?: boolean;
  flushPinSyncQueue?: () => Promise<boolean>;
  loginAsChild: (childId: string, pin?: string) => Promise<boolean>;
  unlockParentWithPin: (pin: string) => Promise<boolean>;
  unlockParentWithCredentials: (email: string, password: string) => Promise<boolean>;
  registerParent: (data: {
    email: string;
    password: string;
    name: string;
    parentPin?: string;
  }) => Promise<void>;
  changeParentPin: (newPin: string, currentPin?: string) => Promise<boolean>;
  lockParent: () => void;
  switchToChildMode: (child?: ChildPublicProfile) => void;
  refreshChildren: () => Promise<void>;
  addChild: (data: {
    name: string;
    pin?: string;
    avatar?: string;
    grade?: string;
  }) => Promise<ChildPublicProfile>;
  updateChild: (
    childId: string,
    data: {
      name?: string;
      pin?: string;
      avatar?: string;
      grade?: string;
      disabledSkills?: Skill[];
    }
  ) => Promise<ChildPublicProfile>;
  deleteChild: (childId: string) => Promise<boolean>;
}

const DEFAULT_CHILD: ChildPublicProfile = {
  id: 'player-local',
  name: 'Alex',
  avatar: 'archer-1',
  grade: '1st Grade',
  hasPin: true,
  parentId: 'parent_default',
};

const DEFAULT_PARENT: ParentPublic = {
  id: 'parent_default',
  email: 'parent@math-archer.local',
  name: 'Demo Parent',
  hasPin: true,
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{
  children: React.ReactNode;
  apiClient?: MathArcherApiClient;
}> = ({ children, apiClient: propClient }) => {
  const apiClient = useMemo(() => propClient ?? new MathArcherApiClient(), [propClient]);

  const [currentMode, setCurrentMode] = useState<'child' | 'parent'>('child');
  const [activeChild, setActiveChild] = useState<ChildPublicProfile>(() => {
    try {
      const stored = localStorage.getItem('math_archer_active_child');
      const parsed = stored ? JSON.parse(stored) : null;
      return parsed ?? DEFAULT_CHILD;
    } catch {
      return DEFAULT_CHILD;
    }
  });

  const [parentUser, setParentUser] = useState<ParentPublic | null>(() => {
    try {
      const stored = localStorage.getItem('math_archer_parent_user');
      return stored ? JSON.parse(stored) : DEFAULT_PARENT;
    } catch {
      return DEFAULT_PARENT;
    }
  });

  const [parentPin, setParentPin] = useState<string>(() => {
    try {
      return localStorage.getItem('math_archer_parent_pin') || '1234';
    } catch {
      return '1234';
    }
  });

  const [isParentUnlocked, setIsParentUnlocked] = useState<boolean>(false);
  const [availableChildren, setAvailableChildren] = useState<ChildPublicProfile[]>([
    DEFAULT_CHILD,
    {
      id: 'child_mia',
      name: 'Mia',
      avatar: 'archer-2',
      grade: '1st Grade',
      hasPin: true,
      parentId: 'parent_default',
    },
  ]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [authToken, setAuthToken] = useState<string | null>(() => apiClient.getAuthToken());
  const isAuthenticated = Boolean(authToken);
  const [error, setError] = useState<string | null>(null);
  const [hasPendingPinSync, setHasPendingPinSync] = useState<boolean>(() =>
    Boolean(loadQueuedPinChange())
  );

  const flushPinSync = useCallback(async (): Promise<boolean> => {
    const queued = loadQueuedPinChange();
    if (!queued) {
      setHasPendingPinSync(false);
      return true;
    }
    const parentId = activeChild?.parentId || parentUser?.id;
    const res = await flushQueuedPinChange(apiClient, { parentId });
    if (res.success) {
      setHasPendingPinSync(false);
      return true;
    }
    return false;
  }, [apiClient, activeChild?.parentId, parentUser?.id]);

  // Helper to reconcile active child with latest child profiles
  const reconcileActiveChild = useCallback((children: ChildPublicProfile[]) => {
    if (!children || children.length === 0) return;
    setActiveChild((prev) => {
      const current = prev ?? DEFAULT_CHILD;
      const matching = children.find((c) => c.id === current.id);
      if (matching) {
        if (
          matching.name !== current.name ||
          matching.avatar !== current.avatar ||
          matching.grade !== current.grade ||
          matching.hasPin !== current.hasPin ||
          JSON.stringify(matching.disabledSkills ?? []) !==
            JSON.stringify(current.disabledSkills ?? []) ||
          matching.parentId !== current.parentId
        ) {
          return matching;
        }
        return current;
      }
      // If the current child was deleted remotely (and is not the default local fallback profile)
      if (current.id !== 'player-local') {
        return children[0] ?? DEFAULT_CHILD;
      }
      return current;
    });
  }, []);

  // Load available child profiles on start and keep them synchronized
  const refreshChildren = useCallback(async () => {
    try {
      const res = await apiClient.getChildProfiles();
      if (res.children && res.children.length > 0) {
        setAvailableChildren(res.children);
        reconcileActiveChild(res.children);
      }
    } catch {
      // Fall back to stored or default children if offline / demo
    }
  }, [apiClient, reconcileActiveChild]);

  useEffect(() => {
    refreshChildren();
    flushPinSync();
  }, [refreshChildren, flushPinSync]);

  // Listen for online and focus events to automatically refresh child profiles across devices/tabs
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleSync = () => {
      refreshChildren();
      flushPinSync();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshChildren();
        flushPinSync();
      }
    };

    window.addEventListener('online', handleSync);
    window.addEventListener('focus', handleSync);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('online', handleSync);
      window.removeEventListener('focus', handleSync);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshChildren, flushPinSync]);

  // Persist active child changes
  useEffect(() => {
    try {
      localStorage.setItem('math_archer_active_child', JSON.stringify(activeChild));
    } catch {
      // localStorage may be disabled
    }
  }, [activeChild]);

  // Auto-authenticate default/active child profile on startup if no auth token is set
  useEffect(() => {
    const existingToken = apiClient.getAuthToken();
    if (!existingToken && activeChild) {
      const pinToTry =
        activeChild.id === 'player-local' ? '1234' : !activeChild.hasPin ? undefined : undefined;
      if (pinToTry !== undefined || !activeChild.hasPin) {
        apiClient
          .loginChild(activeChild.id, pinToTry)
          .then((res) => {
            if (res && res.token && res.child) {
              setAuthToken(res.token);
              setActiveChild(res.child);
            }
          })
          .catch(() => {
            // Offline or server unreachable; keep local profile seamlessly
          });
      }
    }
  }, [apiClient, activeChild]);

  const loginAsChild = useCallback(
    async (childId: string, pin?: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await apiClient.loginChild(childId, pin);
        setAuthToken(res.token);
        setActiveChild(res.child);
        setCurrentMode('child');
        setIsParentUnlocked(false);
        setIsLoading(false);
        return true;
      } catch (err: unknown) {
        // If the server explicitly responded with an error (e.g. 401 Unauthorized), do NOT bypass it!
        if (err instanceof ApiError) {
          setError(err.message || 'Invalid child PIN');
          setIsLoading(false);
          return false;
        }

        // True offline / network failure fallback (only if server could not be reached)
        const found = availableChildren.find((c) => c.id === childId);
        if (found) {
          const expectedPin = found.id === 'child_mia' ? '5678' : '1234';
          if (!found.hasPin || pin === expectedPin) {
            setActiveChild(found);
            setCurrentMode('child');
            setIsParentUnlocked(false);
            setIsLoading(false);
            return true;
          }
        }
        const message = err instanceof Error ? err.message : 'Invalid child PIN';
        setError(message);
        setIsLoading(false);
        return false;
      }
    },
    [apiClient, availableChildren]
  );

  const unlockParentWithPin = useCallback(
    async (pin: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      const queued = loadQueuedPinChange();
      try {
        const parentId = activeChild.parentId || parentUser?.id;
        const pinToVerify =
          queued && pin === queued.newPin && queued.currentPin ? queued.currentPin : pin;
        const res = await apiClient.verifyParentPin(pinToVerify, parentId);
        if (res.valid) {
          if (res.token) {
            apiClient.setAuthToken(res.token);
            setAuthToken(res.token);
          }
          setIsParentUnlocked(true);
          setCurrentMode('parent');
          if (res.parent) {
            setParentUser(res.parent);
          }
          setIsLoading(false);
          refreshChildren();

          if (queued && pin === queued.newPin) {
            flushQueuedPinChange(apiClient, { parentId }).then((flushRes) => {
              if (flushRes.success) {
                setHasPendingPinSync(false);
              }
            });
          }
          return true;
        }
        setError('Incorrect Parent PIN. Please try again.');
        setIsLoading(false);
        return false;
      } catch (err: unknown) {
        // If the server explicitly rejected the PIN, do not bypass!
        if (err instanceof ApiError) {
          setError(err.message || 'Incorrect Parent PIN. Please try again.');
          setIsLoading(false);
          return false;
        }
        // Fallback for local demo PIN only if offline/unreachable
        if (pin === parentPin) {
          setIsParentUnlocked(true);
          setCurrentMode('parent');
          setIsLoading(false);
          return true;
        }
        setError('Incorrect Parent PIN. Please try again.');
        setIsLoading(false);
        return false;
      }
    },
    [apiClient, activeChild?.parentId, parentUser?.id, parentPin, refreshChildren]
  );

  const unlockParentWithCredentials = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await apiClient.loginParent({ email, password });
        setAuthToken(res.token);
        setParentUser(res.parent);
        if (res.children) {
          setAvailableChildren(res.children);
          reconcileActiveChild(res.children);
        }
        setIsParentUnlocked(true);
        setCurrentMode('parent');
        setIsLoading(false);
        flushPinSync();
        return true;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Invalid parent credentials';
        setError(message);
        setIsLoading(false);
        return false;
      }
    },
    [apiClient, reconcileActiveChild, flushPinSync]
  );

  const registerParent = useCallback(
    async (data: {
      email: string;
      password: string;
      name: string;
      parentPin?: string;
    }): Promise<void> => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await apiClient.registerParent(data);
        setParentUser(res.parent);
        setAuthToken(res.token);
        if (data.parentPin) {
          setParentPin(data.parentPin);
          try {
            localStorage.setItem('math_archer_parent_pin', data.parentPin);
          } catch {
            // ignore
          }
        }
        setIsParentUnlocked(true);
        setCurrentMode('parent');
        setIsLoading(false);
        flushPinSync();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Registration failed';
        setError(message);
        setIsLoading(false);
        throw err;
      }
    },
    [apiClient, flushPinSync]
  );

  const changeParentPin = useCallback(
    async (newPin: string, currentPin?: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await apiClient.changeParentPin({ newPin, currentPin });
        if (res.parent) {
          setParentUser(res.parent);
        }
        setParentPin(newPin);
        try {
          localStorage.setItem('math_archer_parent_pin', newPin);
        } catch {
          // ignore
        }
        clearQueuedPinChange();
        setHasPendingPinSync(false);
        setIsLoading(false);
        return true;
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          setError(err.message);
          setIsLoading(false);
          throw err;
        }
        // Local fallback (offline/demo)
        if (currentPin && currentPin !== parentPin) {
          const msg = 'Current PIN is incorrect';
          setError(msg);
          setIsLoading(false);
          throw new Error(msg);
        }
        if (!/^\d{4}$/.test(newPin)) {
          const msg = 'PIN must be exactly 4 digits';
          setError(msg);
          setIsLoading(false);
          throw new Error(msg);
        }
        setParentPin(newPin);
        try {
          localStorage.setItem('math_archer_parent_pin', newPin);
        } catch {
          // ignore
        }
        enqueuePinChange({ newPin, currentPin: currentPin ?? parentPin });
        setHasPendingPinSync(true);
        setParentUser((prev) => (prev ? { ...prev, hasPin: true } : prev));
        setIsLoading(false);
        return true;
      }
    },
    [apiClient, parentPin]
  );

  const lockParent = useCallback(() => {
    setIsParentUnlocked(false);
    setCurrentMode('child');
    apiClient.setAuthToken(null);
    setAuthToken(null);
    if (activeChild) {
      const pinToTry =
        activeChild.id === 'player-local' ? '1234' : !activeChild.hasPin ? undefined : undefined;
      if (pinToTry !== undefined || !activeChild.hasPin) {
        apiClient
          .loginChild(activeChild.id, pinToTry)
          .then((res) => {
            setAuthToken(res.token);
            setActiveChild(res.child);
          })
          .catch(() => {});
      }
    }
  }, [apiClient, activeChild]);

  const switchToChildMode = useCallback(
    (child?: ChildPublicProfile) => {
      if (child) {
        setActiveChild(child);
      } else {
        setActiveChild((prev) => {
          const matching = availableChildren.find((c) => c.id === prev.id);
          return matching ?? prev;
        });
      }
      setCurrentMode('child');
      setIsParentUnlocked(false);
    },
    [availableChildren]
  );

  const addChild = useCallback(
    async (data: {
      name: string;
      pin?: string;
      avatar?: string;
      grade?: string;
    }): Promise<ChildPublicProfile> => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await apiClient.createChildProfile(data);
        setAvailableChildren((prev) => [...prev, res.child]);
        setIsLoading(false);
        return res.child;
      } catch {
        // Local fallback
        const newChild: ChildPublicProfile = {
          id: `child_${Date.now()}`,
          name: data.name,
          avatar: data.avatar || 'archer-1',
          grade: data.grade || '1st Grade',
          hasPin: Boolean(data.pin),
          parentId: parentUser?.id || 'parent_default',
        };
        setAvailableChildren((prev) => [...prev, newChild]);
        setIsLoading(false);
        return newChild;
      }
    },
    [apiClient, parentUser?.id]
  );

  const updateChild = useCallback(
    async (
      childId: string,
      data: {
        name?: string;
        pin?: string;
        avatar?: string;
        grade?: string;
        disabledSkills?: Skill[];
      }
    ): Promise<ChildPublicProfile> => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await apiClient.updateChildProfile(childId, data);
        setAvailableChildren((prev) => prev.map((c) => (c.id === childId ? res.child : c)));
        setActiveChild((prev) => (prev?.id === childId ? res.child : prev));
        setIsLoading(false);
        return res.child;
      } catch (err: unknown) {
        if (err instanceof ApiError || data.disabledSkills !== undefined) {
          setError(err instanceof Error ? err.message : 'Unable to save practice skills');
          setIsLoading(false);
          throw err;
        }
        // Local fallback
        let updated: ChildPublicProfile | undefined;
        setAvailableChildren((prev) =>
          prev.map((c) => {
            if (c.id === childId) {
              updated = {
                ...c,
                ...data,
                hasPin: data.pin !== undefined ? Boolean(data.pin) : c.hasPin,
              };
              return updated;
            }
            return c;
          })
        );
        setActiveChild((prev) => (prev?.id === childId && updated ? updated : prev));
        setIsLoading(false);
        return (
          updated || {
            id: childId,
            name: data.name || 'Child',
            avatar: data.avatar || 'archer-1',
            grade: data.grade || '1st Grade',
            hasPin: Boolean(data.pin),
            parentId: parentUser?.id || 'parent_default',
          }
        );
      }
    },
    [apiClient, parentUser?.id]
  );

  const deleteChild = useCallback(
    async (childId: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      try {
        await apiClient.deleteChildProfile(childId);
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          setError(err.message);
          setIsLoading(false);
          throw err;
        }
      }
      setAvailableChildren((prev) => {
        const remaining = prev.filter((c) => c.id !== childId);
        setActiveChild((curr) => {
          if (curr?.id === childId) {
            return remaining[0] ?? DEFAULT_CHILD;
          }
          return curr;
        });
        return remaining;
      });
      setIsLoading(false);
      return true;
    },
    [apiClient]
  );

  const value: AuthContextValue = {
    currentMode,
    activeChild,
    parentUser,
    parentPin,
    isParentUnlocked,
    availableChildren,
    apiClient,
    authToken,
    isAuthenticated,
    isLoading,
    error,
    hasPendingPinSync,
    flushPinSyncQueue: flushPinSync,
    loginAsChild,
    unlockParentWithPin,
    unlockParentWithCredentials,
    registerParent,
    changeParentPin,
    lockParent,
    switchToChildMode,
    refreshChildren,
    addChild,
    updateChild,
    deleteChild,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function useSafeAuth(): AuthContextValue | null {
  return useContext(AuthContext);
}
