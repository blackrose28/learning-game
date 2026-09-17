import type {
  Attempt,
  DailySession,
  SkillProfile,
  AttemptSummaryStats,
  PracticeRecommendation,
} from '@math-archer/learning-engine';

export interface ParentPublic {
  id: string;
  email: string;
  name: string;
  hasPin: boolean;
}

export interface ChildPublicProfile {
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
}

export class ApiError extends Error {
  code?: string;
  status: number;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function parseApiError(res: Response): Promise<{ message: string; code?: string }> {
  try {
    const data = (await res.json()) as ApiErrorPayload;
    return {
      message: data.message || res.statusText || `Request failed with status ${res.status}`,
      code: data.error,
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

  private url(endpoint: string): string {
    return `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  }

  private getHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
    const headers: Record<string, string> = { ...extraHeaders };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
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
}
