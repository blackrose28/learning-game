import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  MathArcherApiClient,
  ApiError,
  type ChildPublicProfile,
  type ParentPublic,
} from '../api/client';

export interface AuthContextValue {
  currentMode: 'child' | 'parent';
  activeChild: ChildPublicProfile;
  parentUser: ParentPublic | null;
  parentPin: string;
  isParentUnlocked: boolean;
  availableChildren: ChildPublicProfile[];
  apiClient: MathArcherApiClient;
  isLoading: boolean;
  error: string | null;
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
    data: { name?: string; pin?: string; avatar?: string; grade?: string }
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
      return stored ? JSON.parse(stored) : DEFAULT_CHILD;
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
  const [error, setError] = useState<string | null>(null);

  // Load available child profiles on start
  const refreshChildren = useCallback(async () => {
    try {
      const res = await apiClient.getChildProfiles();
      if (res.children && res.children.length > 0) {
        setAvailableChildren(res.children);
      }
    } catch {
      // Fall back to stored or default children if offline / demo
    }
  }, [apiClient]);

  useEffect(() => {
    refreshChildren();
  }, [refreshChildren]);

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
            setActiveChild(res.child);
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
      try {
        const parentId = activeChild.parentId || parentUser?.id;
        const res = await apiClient.verifyParentPin(pin, parentId);
        if (res.valid) {
          if (res.token) {
            apiClient.setAuthToken(res.token);
          }
          setIsParentUnlocked(true);
          setCurrentMode('parent');
          if (res.parent) {
            setParentUser(res.parent);
          }
          setIsLoading(false);
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
    [apiClient, activeChild.parentId, parentUser?.id, parentPin]
  );

  const unlockParentWithCredentials = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await apiClient.loginParent({ email, password });
        setParentUser(res.parent);
        if (res.children) {
          setAvailableChildren(res.children);
        }
        setIsParentUnlocked(true);
        setCurrentMode('parent');
        setIsLoading(false);
        return true;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Invalid parent credentials';
        setError(message);
        setIsLoading(false);
        return false;
      }
    },
    [apiClient]
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
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Registration failed';
        setError(message);
        setIsLoading(false);
        throw err;
      }
    },
    [apiClient]
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
  }, [apiClient]);

  const switchToChildMode = useCallback((child?: ChildPublicProfile) => {
    if (child) {
      setActiveChild(child);
    }
    setCurrentMode('child');
    setIsParentUnlocked(false);
  }, []);

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
          pin: data.pin,
          avatar: data.avatar || 'archer-1',
          grade: data.grade || '1st Grade',
          hasPin: Boolean(data.pin),
        } as ChildPublicProfile;
        setAvailableChildren((prev) => [...prev, newChild]);
        setIsLoading(false);
        return newChild;
      }
    },
    [apiClient]
  );

  const updateChild = useCallback(
    async (
      childId: string,
      data: { name?: string; pin?: string; avatar?: string; grade?: string }
    ): Promise<ChildPublicProfile> => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await apiClient.updateChildProfile(childId, data);
        setAvailableChildren((prev) => prev.map((c) => (c.id === childId ? res.child : c)));
        setActiveChild((prev) => (prev.id === childId ? res.child : prev));
        setIsLoading(false);
        return res.child;
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          setError(err.message);
          setIsLoading(false);
          throw err;
        }
        // Local fallback
        const existing = availableChildren.find((c) => c.id === childId);
        if (existing) {
          const updated: ChildPublicProfile = {
            ...existing,
            ...(data.name !== undefined ? { name: data.name } : {}),
            ...(data.avatar !== undefined ? { avatar: data.avatar } : {}),
            ...(data.grade !== undefined ? { grade: data.grade } : {}),
            ...(data.pin !== undefined ? { hasPin: Boolean(data.pin) } : {}),
          };
          setAvailableChildren((prev) => prev.map((c) => (c.id === childId ? updated : c)));
          setActiveChild((prev) => (prev.id === childId ? updated : prev));
          setIsLoading(false);
          return updated;
        }
        setIsLoading(false);
        throw new Error('Child not found');
      }
    },
    [apiClient, availableChildren]
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
      setAvailableChildren((prev) => prev.filter((c) => c.id !== childId));
      setActiveChild((prev) => {
        if (prev.id === childId) {
          const remaining = availableChildren.filter((c) => c.id !== childId);
          return remaining[0] ?? DEFAULT_CHILD;
        }
        return prev;
      });
      setIsLoading(false);
      return true;
    },
    [apiClient, availableChildren]
  );

  const value: AuthContextValue = {
    currentMode,
    activeChild,
    parentUser,
    parentPin,
    isParentUnlocked,
    availableChildren,
    apiClient,
    isLoading,
    error,
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
