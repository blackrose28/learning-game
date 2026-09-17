import type {
  Attempt,
  SkillProfile,
  DailySession,
  AttemptSummaryStats,
  PracticeRecommendation,
} from '@math-archer/learning-engine';

export interface Env {
  DB: D1Database;
  ASSETS?: Fetcher;
  JWT_SECRET?: string;
}

export interface ParentRecord {
  id: string;
  email: string;
  password_hash: string;
  salt: string;
  name: string;
  parent_pin?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ParentPublic {
  id: string;
  email: string;
  name: string;
  hasPin: boolean;
}

export interface ChildProfileRecord {
  id: string;
  name: string;
  parent_id?: string | null;
  pin?: string | null;
  avatar: string;
  grade: string;
  created_at: string;
  updated_at: string;
}

export interface ChildPublicProfile {
  id: string;
  name: string;
  avatar: string;
  grade: string;
  parentId?: string;
  hasPin: boolean;
}

export interface ParentRegisterRequest {
  email: string;
  password: string;
  name: string;
  parentPin?: string;
}

export interface ParentRegisterResponse {
  token: string;
  parent: ParentPublic;
}

export interface ParentLoginRequest {
  email: string;
  password: string;
}

export interface ParentLoginResponse {
  token: string;
  parent: ParentPublic;
  children: ChildPublicProfile[];
}

export interface ParentVerifyPinRequest {
  parentPin: string;
}

export interface ParentVerifyPinResponse {
  valid: boolean;
  parent?: ParentPublic;
}

export interface ChildLoginRequest {
  childId: string;
  pin?: string;
}

export interface ChildLoginResponse {
  token: string;
  child: ChildPublicProfile;
}

export interface ChildProfilesResponse {
  children: ChildPublicProfile[];
}

export interface AuthMeResponse {
  role: 'parent' | 'child';
  parent?: ParentPublic;
  child?: ChildPublicProfile;
}

export interface ParentCreateChildRequest {
  name: string;
  pin?: string;
  avatar?: string;
  grade?: string;
}

export interface ParentUpdateChildRequest {
  name?: string;
  pin?: string;
  avatar?: string;
  grade?: string;
}

export interface StartSessionRequest {
  playerId?: string;
  date?: string;
  arrowsAllowed?: number;
}

export interface StartSessionResponse {
  session: DailySession;
}

export interface PostAttemptsRequest {
  playerId: string;
  attempt?: Attempt;
  attempts?: Attempt[];
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

export interface ErrorResponse {
  error: string;
  message: string;
  details?: unknown;
}
