import type {
  Attempt,
  DailySession,
  SkillProfile,
  Skill,
  AnimationSpeed,
  AttemptSummaryStats,
  PracticeRecommendation,
  WorldProgressionState,
  PlayerRewardsState,
  ReasoningSettings,
  MissionAttempt,
  StoredMissionAttempt,
  MissionAttemptPage,
  MissionSaveResponse,
} from '@math-archer/learning-engine';
import { restoreMissionAttempt } from '@math-archer/learning-engine';

export interface ParentPublic {
  id: string;
  email: string;
  name: string;
  hasPin: boolean;
}

export interface ChildPublicProfile {
  disabledSkills?: Skill[];
  animationSpeed?: AnimationSpeed;
  reasoningSettings?: ReasoningSettings;
  id: string;
  name: string;
  avatar: string;
  grade: string;
  parentId?: string;
  hasPin: boolean;
}

export interface StartSessionResponse {
  session: DailySession;
}

export interface PostAttemptsResponse {
  success: boolean;
  accepted: number;
  session?: DailySession;
  remainingArrows?: number;
  error?: string;
}

export interface TodaySessionResponse {
  session: DailySession | null;
}

export interface ProgressResponse {
  profile: SkillProfile;
  stats: AttemptSummaryStats;
  currentSession: DailySession | null;
  sessions?: DailySession[];
  attempts?: Attempt[];
  worldProgression?: WorldProgressionState | null;
  rewards?: PlayerRewardsState | null;
}

export interface UpdateWorldResponse {
  success: boolean;
  worldProgression: WorldProgressionState;
}

export interface UpdateRewardsResponse {
  success: boolean;
  rewards: PlayerRewardsState;
}

export interface RecommendationsResponse {
  recommendation: PracticeRecommendation;
}

export interface ApiClientOptions {
  baseUrl?: string;
  fetchFn?: typeof fetch;
  token?: string | null;
}

export interface ApiErrorPayload {
  error?: string;
  message?: string;
  details?: unknown;
}

export class ApiError extends Error {
  code?: string;
  status: number;
  details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function parseApiError(
  res: Response
): Promise<{ message: string; code?: string; details?: unknown }> {
  try {
    const data = (await res.json()) as ApiErrorPayload;
    return {
      message: data.message || res.statusText || `Request failed with status ${res.status}`,
      code: data.error,
      details: data.details,
    };
  } catch {
    return {
      message: res.statusText || `Request failed with status ${res.status}`,
    };
  }
}

export class MathArcherApiClient {
  private baseUrl: string;
  private fetchFn: typeof fetch;
  private token: string | null = null;

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? '').replace(/\/+$/, '');
    this.fetchFn =
      options.fetchFn ?? (typeof window !== 'undefined' ? window.fetch.bind(window) : fetch);
    if (options.token !== undefined) {
      this.token = options.token;
    } else if (typeof localStorage !== 'undefined') {
      try {
        this.token = localStorage.getItem('math_archer_auth_token');
      } catch {
        this.token = null;
      }
    }
  }

  setAuthToken(token: string | null): void {
    this.token = token;
    if (typeof localStorage !== 'undefined') {
      try {
        if (token) {
          localStorage.setItem('math_archer_auth_token', token);
        } else {
          localStorage.removeItem('math_archer_auth_token');
        }
      } catch {
        // localStorage may be disabled
      }
    }
  }

  getAuthToken(): string | null {
    return this.token;
  }

  private async missionResponse(res: Response): Promise<Record<string, unknown>> {
    if (!res.ok) {
      const err = await parseApiError(res);
      throw new ApiError(err.message, res.status, err.code, err.details);
    }
    const value: unknown = await res.json();
    if (
      !value ||
      typeof value !== 'object' ||
      (value as { schemaVersion?: unknown }).schemaVersion !== 1
    ) {
      throw new ApiError(
        'Unsupported mission response version',
        400,
        'UNSUPPORTED_MISSION_VERSION'
      );
    }
    return value as Record<string, unknown>;
  }

  async saveMissionAttempt(attempt: MissionAttempt): Promise<MissionSaveResponse> {
    const res = await this.fetchFn(this.url('/api/missions/attempts'), {
      method: 'PUT',
      headers: this.getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ schemaVersion: 1, attempt: restoreMissionAttempt(attempt) }),
    });
    const value = await this.missionResponse(res);
    const stored = validateStoredMissionAttempt(value, attempt.playerId);
    if (
      stored.attempt.id !== attempt.id ||
      !['created', 'advanced', 'unchanged', 'stale'].includes(String(value.disposition))
    ) {
      throw new Error('Invalid mission save response');
    }
    return {
      schemaVersion: 1,
      ...stored,
      disposition: value.disposition as MissionSaveResponse['disposition'],
    };
  }

  async getMissionAttempt(playerId: string, attemptId: string): Promise<StoredMissionAttempt> {
    const query = new URLSearchParams({ playerId, attemptId });
    const res = await this.fetchFn(this.url(`/api/missions/attempts?${query}`), {
      headers: this.getHeaders(),
    });
    const stored = validateStoredMissionAttempt(await this.missionResponse(res), playerId);
    if (stored.attempt.id !== attemptId) throw new Error('Mission response identity mismatch');
    return stored;
  }

  async listMissionAttempts(
    playerId: string,
    cursor?: { startedAt: string; attemptId: string }
  ): Promise<MissionAttemptPage> {
    const query = new URLSearchParams({ playerId, limit: '100' });
    if (cursor) {
      query.set('afterStartedAt', cursor.startedAt);
      query.set('afterAttemptId', cursor.attemptId);
    }
    const res = await this.fetchFn(this.url(`/api/missions/attempts?${query}`), {
      headers: this.getHeaders(),
    });
    const value = await this.missionResponse(res);
    if (!Array.isArray(value.attempts)) throw new Error('Invalid mission attempt listing');
    const next = value.nextCursor;
    if (
      next !== null &&
      (!next ||
        typeof next !== 'object' ||
        typeof (next as { startedAt?: unknown }).startedAt !== 'string' ||
        !Number.isFinite(Date.parse((next as { startedAt: string }).startedAt)) ||
        new Date((next as { startedAt: string }).startedAt).toISOString() !==
          (next as { startedAt: string }).startedAt ||
        typeof (next as { attemptId?: unknown }).attemptId !== 'string' ||
        !(next as { attemptId: string }).attemptId.trim())
    ) {
      throw new Error('Invalid mission listing cursor');
    }
    return {
      schemaVersion: 1,
      attempts: value.attempts.map((item) => validateStoredMissionAttempt(item, playerId)),
      nextCursor: next as MissionAttemptPage['nextCursor'],
    };
  }

  private url(endpoint: string): string {
    return `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  }

  private getHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
    const headers: Record<string, string> = { ...extraHeaders };
    const token =
      this.token ||
      (typeof localStorage !== 'undefined' ? localStorage.getItem('math_archer_auth_token') : null);
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  // --- Auth methods ---

  async registerParent(params: {
    email: string;
    password: string;
    name: string;
    parentPin?: string;
  }): Promise<{ token: string; parent: ParentPublic }> {
    const res = await this.fetchFn(this.url('/api/auth/parent/register'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const err = await parseApiError(res);
      throw new ApiError(err.message, res.status, err.code);
    }

    const data = (await res.json()) as { token: string; parent: ParentPublic };
    this.setAuthToken(data.token);
    return data;
  }

  async loginParent(params: {
    email: string;
    password: string;
  }): Promise<{ token: string; parent: ParentPublic; children: ChildPublicProfile[] }> {
    const res = await this.fetchFn(this.url('/api/auth/parent/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const err = await parseApiError(res);
      throw new ApiError(err.message, res.status, err.code);
    }

    const data = (await res.json()) as {
      token: string;
      parent: ParentPublic;
      children: ChildPublicProfile[];
    };
    this.setAuthToken(data.token);
    return data;
  }

  async verifyParentPin(
    parentPin: string,
    parentId?: string
  ): Promise<{ valid: boolean; token?: string; parent?: ParentPublic }> {
    const res = await this.fetchFn(this.url('/api/auth/parent/verify-pin'), {
      method: 'POST',
      headers: this.getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ parentPin, parentId }),
    });

    if (!res.ok) {
      const err = await parseApiError(res);
      throw new ApiError(err.message, res.status, err.code);
    }

    const data = (await res.json()) as { valid: boolean; token?: string; parent?: ParentPublic };
    if (data.valid && data.token) {
      this.setAuthToken(data.token);
    }
    return data;
  }

  async getChildProfiles(parentId?: string): Promise<{ children: ChildPublicProfile[] }> {
    const query = parentId ? `?parentId=${encodeURIComponent(parentId)}` : '';
    const res = await this.fetchFn(this.url(`/api/auth/child/profiles${query}`), {
      method: 'GET',
    });

    if (!res.ok) {
      const err = await parseApiError(res);
      throw new ApiError(err.message, res.status, err.code);
    }

    return res.json();
  }

  async loginChild(
    childId: string,
    pin?: string
  ): Promise<{ token: string; child: ChildPublicProfile }> {
    const res = await this.fetchFn(this.url('/api/auth/child/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ childId, pin }),
    });

    if (!res.ok) {
      const err = await parseApiError(res);
      throw new ApiError(err.message, res.status, err.code);
    }

    const data = (await res.json()) as { token: string; child: ChildPublicProfile };
    this.setAuthToken(data.token);
    return data;
  }

  async getMe(): Promise<{
    role: 'parent' | 'child';
    parent?: ParentPublic;
    child?: ChildPublicProfile;
  }> {
    const res = await this.fetchFn(this.url('/api/auth/me'), {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      const err = await parseApiError(res);
      throw new ApiError(err.message, res.status, err.code);
    }

    return res.json();
  }

  async getParentChildren(): Promise<{ children: ChildPublicProfile[] }> {
    const res = await this.fetchFn(this.url('/api/parent/children'), {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      const err = await parseApiError(res);
      throw new ApiError(err.message, res.status, err.code);
    }

    return res.json();
  }

  async createChildProfile(params: {
    name: string;
    pin?: string;
    avatar?: string;
    grade?: string;
  }): Promise<{ child: ChildPublicProfile }> {
    const res = await this.fetchFn(this.url('/api/parent/children'), {
      method: 'POST',
      headers: this.getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const err = await parseApiError(res);
      throw new ApiError(err.message, res.status, err.code);
    }

    return res.json();
  }

  async updateChildProfile(
    childId: string,
    params: {
      name?: string;
      pin?: string;
      avatar?: string;
      grade?: string;
      disabledSkills?: Skill[];
      animationSpeed?: AnimationSpeed;
      reasoningSettings?: ReasoningSettings;
    }
  ): Promise<{ child: ChildPublicProfile }> {
    const res = await this.fetchFn(
      this.url(`/api/parent/children/${encodeURIComponent(childId)}`),
      {
        method: 'PUT',
        headers: this.getHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(params),
      }
    );

    if (!res.ok) {
      const err = await parseApiError(res);
      throw new ApiError(err.message, res.status, err.code);
    }

    return res.json();
  }

  async deleteChildProfile(childId: string): Promise<{ success: boolean }> {
    const res = await this.fetchFn(
      this.url(`/api/parent/children/${encodeURIComponent(childId)}`),
      {
        method: 'DELETE',
        headers: this.getHeaders(),
      }
    );

    if (!res.ok) {
      const err = await parseApiError(res);
      throw new ApiError(err.message, res.status, err.code);
    }

    return res.json();
  }

  async changeParentPin(params: {
    newPin: string;
    currentPin?: string;
  }): Promise<{ success: boolean; parent: ParentPublic }> {
    const res = await this.fetchFn(this.url('/api/parent/pin'), {
      method: 'PUT',
      headers: this.getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const err = await parseApiError(res);
      throw new ApiError(err.message, res.status, err.code);
    }

    return res.json();
  }

  // --- Protected Game / Learning Engine methods ---

  async startSession(
    params: {
      playerId?: string;
      date?: string;
      arrowsAllowed?: number;
    } = {}
  ): Promise<StartSessionResponse> {
    const res = await this.fetchFn(this.url('/api/sessions/start'), {
      method: 'POST',
      headers: this.getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const err = await parseApiError(res);
      throw new ApiError(err.message, res.status, err.code);
    }

    return res.json();
  }

  async getTodaySession(playerId = 'player-local', date?: string): Promise<TodaySessionResponse> {
    const query = new URLSearchParams({ playerId });
    if (date) query.set('date', date);

    const res = await this.fetchFn(this.url(`/api/sessions/today?${query.toString()}`), {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      const err = await parseApiError(res);
      throw new ApiError(err.message, res.status, err.code);
    }

    return res.json();
  }

  async submitAttempt(playerId: string, attempt: Attempt): Promise<PostAttemptsResponse> {
    const res = await this.fetchFn(this.url('/api/attempts'), {
      method: 'POST',
      headers: this.getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ playerId, attempt }),
    });

    if (!res.ok) {
      const err = await parseApiError(res);
      throw new ApiError(err.message, res.status, err.code);
    }

    return res.json();
  }

  async submitAttemptsBatch(playerId: string, attempts: Attempt[]): Promise<PostAttemptsResponse> {
    const res = await this.fetchFn(this.url('/api/attempts'), {
      method: 'POST',
      headers: this.getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ playerId, attempts }),
    });

    if (!res.ok) {
      const err = await parseApiError(res);
      throw new ApiError(err.message, res.status, err.code);
    }

    return res.json();
  }

  async getProgress(playerId = 'player-local', date?: string): Promise<ProgressResponse> {
    const query = new URLSearchParams({ playerId });
    if (date) query.set('date', date);

    const res = await this.fetchFn(this.url(`/api/progress?${query.toString()}`), {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      const err = await parseApiError(res);
      throw new ApiError(err.message, res.status, err.code);
    }

    return res.json();
  }

  async getRecommendations(playerId = 'player-local'): Promise<RecommendationsResponse> {
    const query = new URLSearchParams({ playerId });
    const res = await this.fetchFn(this.url(`/api/recommendations?${query.toString()}`), {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      const err = await parseApiError(res);
      throw new ApiError(err.message, res.status, err.code);
    }

    return res.json();
  }

  async updateWorldProgression(
    data: Partial<WorldProgressionState>,
    playerId?: string
  ): Promise<UpdateWorldResponse> {
    const res = await this.fetchFn(this.url('/api/progress/world'), {
      method: 'PUT',
      headers: this.getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ ...data, ...(playerId ? { playerId } : {}) }),
    });

    if (!res.ok) {
      const err = await parseApiError(res);
      throw new ApiError(err.message, res.status, err.code);
    }

    return res.json();
  }

  async updatePlayerRewards(
    data: Partial<PlayerRewardsState>,
    playerId?: string
  ): Promise<UpdateRewardsResponse> {
    const res = await this.fetchFn(this.url('/api/progress/rewards'), {
      method: 'PUT',
      headers: this.getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ ...data, ...(playerId ? { playerId } : {}) }),
    });

    if (!res.ok) {
      const err = await parseApiError(res);
      throw new ApiError(err.message, res.status, err.code);
    }

    return res.json();
  }
}

export function validateStoredMissionAttempt(
  value: unknown,
  playerId: string
): StoredMissionAttempt {
  if (!value || typeof value !== 'object') throw new Error('Invalid stored mission response');
  const stored = value as StoredMissionAttempt;
  const attempt = restoreMissionAttempt(stored.attempt);
  if (attempt.playerId !== playerId || !Number.isInteger(stored.revision) || stored.revision < 1) {
    throw new Error('Mission response identity or revision mismatch');
  }
  return { attempt, revision: stored.revision };
}
