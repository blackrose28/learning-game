import type {
  Attempt,
  DailySession,
  SkillProfile,
  AttemptSummaryStats,
  PracticeRecommendation,
} from '@math-archer/learning-engine';

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

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? '').replace(/\/+$/, '');
    this.fetchFn = options.fetchFn ?? (typeof window !== 'undefined' ? window.fetch.bind(window) : fetch);
  }

  private url(endpoint: string): string {
    return `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  }

  async startSession(params: {
    playerId?: string;
    date?: string;
    arrowsAllowed?: number;
  } = {}): Promise<StartSessionResponse> {
    const res = await this.fetchFn(this.url('/api/sessions/start'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
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
    });

    if (!res.ok) {
      const err = await parseApiError(res);
      throw new ApiError(err.message, res.status, err.code);
    }

    return res.json();
  }
}

