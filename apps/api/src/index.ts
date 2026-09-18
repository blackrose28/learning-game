import type {
  Env,
  ErrorResponse,
  ParentRegisterRequest,
  ParentLoginRequest,
  ParentVerifyPinRequest,
  ChildLoginRequest,
  ParentCreateChildRequest,
  ParentUpdateChildRequest,
  ParentChangePinRequest,
} from './types';
import {
  DailyLimitError,
  getOrCreateSession,
  getTodaySessionFromDb,
  recordAttemptInDb,
  getPlayerProgressFromDb,
  getPlayerRecommendationsFromDb,
  createParent,
  getParentByEmail,
  getParentById,
  updateParentPin,
  createChildProfile,
  getChildrenForParent,
  getChildProfile,
  getAllPublicChildProfiles,
  verifyChildBelongsToParent,
  updateChildProfile,
  deleteChildProfile,
  saveWorldProgressionToDb,
  savePlayerRewardsToDb,
} from './db';
import {
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  extractBearerToken,
  type TokenPayload,
} from './auth';
import type { Attempt, DailySession } from '@math-archer/learning-engine';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const DEFAULT_JWT_SECRET = 'math-archer-jwt-super-secret-key-2026';

function getJwtSecret(env: Env): string {
  return env.JWT_SECRET || DEFAULT_JWT_SECRET;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...CORS_HEADERS,
    },
  });
}

function errorResponse(error: string, message: string, status = 400, details?: unknown): Response {
  const body: ErrorResponse = { error, message, details };
  return jsonResponse(body, status);
}

function validateAttempt(att: unknown): { valid: boolean; error?: string } {
  if (!att || typeof att !== 'object') {
    return { valid: false, error: 'Attempt must be an object' };
  }
  const a = att as Partial<Attempt>;
  if (typeof a.questionId !== 'string' || !a.questionId) {
    return { valid: false, error: 'Missing or invalid questionId' };
  }
  if (a.operation !== 'add' && a.operation !== 'subtract') {
    return { valid: false, error: 'Invalid operation; must be add or subtract' };
  }
  if (typeof a.left !== 'number' || typeof a.right !== 'number') {
    return { valid: false, error: 'left and right operands must be numbers' };
  }
  if (typeof a.answer !== 'number' || typeof a.selectedAnswer !== 'number') {
    return { valid: false, error: 'answer and selectedAnswer must be numbers' };
  }
  if (typeof a.correct !== 'boolean') {
    return { valid: false, error: 'correct must be a boolean' };
  }
  if (typeof a.responseTimeMs !== 'number' || a.responseTimeMs < 0) {
    return { valid: false, error: 'responseTimeMs must be a non-negative number' };
  }
  if (typeof a.skill !== 'string' || !a.skill) {
    return { valid: false, error: 'Missing or invalid skill' };
  }
  if (typeof a.timestamp !== 'string' || isNaN(Date.parse(a.timestamp))) {
    return { valid: false, error: 'Missing or invalid ISO timestamp' };
  }
  return { valid: true };
}

async function getAuthContext(request: Request, env: Env): Promise<TokenPayload | null> {
  const token = extractBearerToken(request);
  if (!token) return null;
  return await verifyToken(token, getJwtSecret(env));
}

export default {
  async fetch(request: Request, env: Env, _ctx?: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method.toUpperCase();

    // CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
      });
    }

    try {
      // -------------------------------------------------------------
      // PUBLIC AUTH ENDPOINTS
      // -------------------------------------------------------------

      // POST /api/auth/parent/register
      if (method === 'POST' && pathname === '/api/auth/parent/register') {
        let body: Partial<ParentRegisterRequest> = {};
        try {
          body = (await request.json()) as Partial<ParentRegisterRequest>;
        } catch {
          return errorResponse('MALFORMED_JSON', 'Request body must be valid JSON', 400);
        }

        if (!body.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
          return errorResponse('INVALID_EMAIL', 'A valid email is required', 400);
        }
        if (!body.password || body.password.length < 6) {
          return errorResponse('INVALID_PASSWORD', 'Password must be at least 6 characters', 400);
        }
        if (!body.name || !body.name.trim()) {
          return errorResponse('INVALID_NAME', 'Name is required', 400);
        }

        const existing = await getParentByEmail(env.DB, body.email);
        if (existing) {
          return errorResponse('EMAIL_EXISTS', 'An account with this email already exists', 409);
        }

        const { hash, salt } = await hashPassword(body.password);
        const parent = await createParent(env.DB, {
          email: body.email,
          passwordHash: hash,
          salt,
          name: body.name,
          parentPin: body.parentPin,
        });

        const token = await signToken(
          {
            sub: parent.id,
            role: 'parent',
            email: parent.email,
            name: parent.name,
            exp: Math.floor(Date.now() / 1000) + 7 * 86400,
          },
          getJwtSecret(env)
        );

        return jsonResponse({ token, parent }, 201);
      }

      // POST /api/auth/parent/login
      if (method === 'POST' && pathname === '/api/auth/parent/login') {
        let body: Partial<ParentLoginRequest> = {};
        try {
          body = (await request.json()) as Partial<ParentLoginRequest>;
        } catch {
          return errorResponse('MALFORMED_JSON', 'Request body must be valid JSON', 400);
        }

        if (!body.email || !body.password) {
          return errorResponse('MISSING_CREDENTIALS', 'Email and password are required', 400);
        }

        const parentRecord = await getParentByEmail(env.DB, body.email);
        if (!parentRecord) {
          return errorResponse('INVALID_CREDENTIALS', 'Invalid email or password', 401);
        }

        const validPassword = await verifyPassword(
          body.password,
          parentRecord.password_hash,
          parentRecord.salt
        );
        if (!validPassword) {
          return errorResponse('INVALID_CREDENTIALS', 'Invalid email or password', 401);
        }

        const children = await getChildrenForParent(env.DB, parentRecord.id);
        const token = await signToken(
          {
            sub: parentRecord.id,
            role: 'parent',
            email: parentRecord.email,
            name: parentRecord.name,
            exp: Math.floor(Date.now() / 1000) + 7 * 86400,
          },
          getJwtSecret(env)
        );

        return jsonResponse(
          {
            token,
            parent: {
              id: parentRecord.id,
              email: parentRecord.email,
              name: parentRecord.name,
              hasPin: Boolean(parentRecord.parent_pin),
            },
            children,
          },
          200
        );
      }

      // POST /api/auth/parent/verify-pin
      if (method === 'POST' && pathname === '/api/auth/parent/verify-pin') {
        const auth = await getAuthContext(request, env);
        let body: Partial<ParentVerifyPinRequest> = {};
        try {
          body = (await request.json()) as Partial<ParentVerifyPinRequest>;
        } catch {
          return errorResponse('MALFORMED_JSON', 'Request body must be valid JSON', 400);
        }

        if (!body.parentPin) {
          return errorResponse('MISSING_PIN', 'parentPin is required', 400);
        }

        let parentId: string | undefined = body.parentId;

        if (!parentId && auth) {
          if (auth.role === 'parent') {
            parentId = auth.sub;
          } else if (auth.role === 'child') {
            // If currently logged in as a child, verify against that child's parent
            const childRecord = await getChildProfile(env.DB, auth.sub);
            parentId = childRecord?.parent_id ?? undefined;
          }
        }

        if (!parentId) {
          // Allow verifying PIN for demo parent if not logged in or child has no parent_id
          const demoParent = await getParentByEmail(env.DB, 'parent@math-archer.local');
          parentId = demoParent?.id;
        }

        if (!parentId) {
          return errorResponse('UNAUTHORIZED', 'Authentication required to verify parent PIN', 401);
        }

        const parentRecord = await getParentById(env.DB, parentId);
        if (!parentRecord || !parentRecord.parent_pin) {
          return jsonResponse({ valid: false }, 200);
        }

        const valid = parentRecord.parent_pin === body.parentPin.trim();
        if (!valid) {
          return jsonResponse({ valid: false }, 200);
        }

        const token = await signToken(
          {
            sub: parentRecord.id,
            role: 'parent',
            email: parentRecord.email,
            name: parentRecord.name,
            exp: Math.floor(Date.now() / 1000) + 7 * 86400,
          },
          getJwtSecret(env)
        );

        return jsonResponse(
          {
            valid: true,
            token,
            parent: {
              id: parentRecord.id,
              email: parentRecord.email,
              name: parentRecord.name,
              hasPin: true,
            },
          },
          200
        );
      }

      // GET /api/auth/child/profiles
      // Returns public child profiles for kid profile selection
      if (method === 'GET' && pathname === '/api/auth/child/profiles') {
        const parentId = url.searchParams.get('parentId');
        let children = [];
        if (parentId) {
          children = await getChildrenForParent(env.DB, parentId);
        } else {
          children = await getAllPublicChildProfiles(env.DB);
        }
        return jsonResponse({ children }, 200);
      }

      // POST /api/auth/child/login
      // Simple child login: select profile + optional PIN
      if (method === 'POST' && pathname === '/api/auth/child/login') {
        let body: Partial<ChildLoginRequest> = {};
        try {
          body = (await request.json()) as Partial<ChildLoginRequest>;
        } catch {
          return errorResponse('MALFORMED_JSON', 'Request body must be valid JSON', 400);
        }

        if (!body.childId) {
          return errorResponse('MISSING_CHILD_ID', 'childId is required', 400);
        }

        const childRecord = await getChildProfile(env.DB, body.childId);
        if (!childRecord) {
          return errorResponse('CHILD_NOT_FOUND', 'Child profile not found', 404);
        }

        // If child profile has a PIN configured, verify it
        if (childRecord.pin && childRecord.pin.trim()) {
          const providedPin = body.pin?.trim();
          if (!providedPin || providedPin !== childRecord.pin.trim()) {
            return errorResponse('INVALID_PIN', 'Invalid child PIN', 401);
          }
        }

        const parentId = childRecord.parent_id || 'parent_default';
        const token = await signToken(
          {
            sub: childRecord.id,
            role: 'child',
            name: childRecord.name,
            parentId,
            exp: Math.floor(Date.now() / 1000) + 7 * 86400,
          },
          getJwtSecret(env)
        );

        return jsonResponse(
          {
            token,
            child: {
              id: childRecord.id,
              name: childRecord.name,
              avatar: childRecord.avatar || 'archer-1',
              grade: childRecord.grade || '1st Grade',
              parentId,
              hasPin: Boolean(childRecord.pin && childRecord.pin.trim()),
            },
          },
          200
        );
      }

      // -------------------------------------------------------------
      // AUTH IDENTITY INSPECTOR: GET /api/auth/me
      // -------------------------------------------------------------
      if (method === 'GET' && pathname === '/api/auth/me') {
        const auth = await getAuthContext(request, env);
        if (!auth) {
          return errorResponse('UNAUTHORIZED', 'Authentication token required', 401);
        }

        if (auth.role === 'parent') {
          const parent = await getParentById(env.DB, auth.sub);
          return jsonResponse({
            role: 'parent',
            parent: parent
              ? {
                  id: parent.id,
                  email: parent.email,
                  name: parent.name,
                  hasPin: Boolean(parent.parent_pin),
                }
              : { id: auth.sub, email: auth.email, name: auth.name, hasPin: false },
          });
        }

        if (auth.role === 'child') {
          const child = await getChildProfile(env.DB, auth.sub);
          return jsonResponse({
            role: 'child',
            child: child
              ? {
                  id: child.id,
                  name: child.name,
                  avatar: child.avatar,
                  grade: child.grade,
                  parentId: child.parent_id ?? undefined,
                  hasPin: Boolean(child.pin),
                }
              : {
                  id: auth.sub,
                  name: auth.name,
                  avatar: 'archer-1',
                  grade: '1st Grade',
                  parentId: auth.parentId,
                  hasPin: false,
                },
          });
        }

        return errorResponse('INVALID_ROLE', 'Unknown token role', 400);
      }

      // -------------------------------------------------------------
      // PARENT DASHBOARD ENDPOINTS: /api/parent/*
      // (Task 7.2: Child cannot access parent dashboard)
      // -------------------------------------------------------------
      if (pathname.startsWith('/api/parent')) {
        const auth = await getAuthContext(request, env);
        if (!auth) {
          return errorResponse('UNAUTHORIZED', 'Authentication token required', 401);
        }

        // Child tokens are strictly forbidden from parent dashboard endpoints
        if (auth.role !== 'parent') {
          return errorResponse(
            'FORBIDDEN',
            'Access denied: Parent role required to access parent dashboard',
            403
          );
        }

        const parentId = auth.sub;

        // GET /api/parent/children
        if (method === 'GET' && pathname === '/api/parent/children') {
          const children = await getChildrenForParent(env.DB, parentId);
          return jsonResponse({ children }, 200);
        }

        // POST /api/parent/children
        if (method === 'POST' && pathname === '/api/parent/children') {
          let body: Partial<ParentCreateChildRequest> = {};
          try {
            body = (await request.json()) as Partial<ParentCreateChildRequest>;
          } catch {
            return errorResponse('MALFORMED_JSON', 'Request body must be valid JSON', 400);
          }

          if (!body.name || !body.name.trim()) {
            return errorResponse('INVALID_NAME', 'Child name is required', 400);
          }

          const child = await createChildProfile(env.DB, parentId, {
            name: body.name,
            pin: body.pin,
            avatar: body.avatar,
            grade: body.grade,
          });

          return jsonResponse({ child }, 201);
        }

        // PUT /api/parent/children/:childId
        if (method === 'PUT' && pathname.startsWith('/api/parent/children/')) {
          const childId = pathname.replace('/api/parent/children/', '').trim();
          let body: Partial<ParentUpdateChildRequest> = {};
          try {
            body = (await request.json()) as Partial<ParentUpdateChildRequest>;
          } catch {
            return errorResponse('MALFORMED_JSON', 'Request body must be valid JSON', 400);
          }

          const updated = await updateChildProfile(env.DB, childId, parentId, body);
          if (!updated) {
            return errorResponse('NOT_FOUND', 'Child profile not found', 404);
          }

          return jsonResponse({ child: updated }, 200);
        }

        // DELETE /api/parent/children/:childId
        if (method === 'DELETE' && pathname.startsWith('/api/parent/children/')) {
          const childId = pathname.replace('/api/parent/children/', '').trim();
          const deleted = await deleteChildProfile(env.DB, childId, parentId);
          if (!deleted) {
            return errorResponse('NOT_FOUND', 'Child profile not found', 404);
          }

          return jsonResponse({ success: true }, 200);
        }

        // PUT /api/parent/pin
        if (method === 'PUT' && pathname === '/api/parent/pin') {
          let body: Partial<ParentChangePinRequest> = {};
          try {
            body = (await request.json()) as Partial<ParentChangePinRequest>;
          } catch {
            return errorResponse('MALFORMED_JSON', 'Request body must be valid JSON', 400);
          }

          if (!body.newPin || !/^\d{4}$/.test(body.newPin.trim())) {
            return errorResponse('INVALID_PIN', 'PIN must be exactly 4 digits', 400);
          }

          const parentRecord = await getParentById(env.DB, parentId);
          if (!parentRecord) {
            return errorResponse('NOT_FOUND', 'Parent record not found', 404);
          }

          if (
            parentRecord.parent_pin &&
            body.currentPin !== undefined &&
            body.currentPin.trim() !== parentRecord.parent_pin
          ) {
            return errorResponse('INCORRECT_PIN', 'Current PIN is incorrect', 400);
          }

          const updated = await updateParentPin(env.DB, parentId, body.newPin.trim());
          if (!updated) {
            return errorResponse('INTERNAL_ERROR', 'Failed to update PIN', 500);
          }

          return jsonResponse(
            {
              success: true,
              parent: {
                id: updated.id,
                email: updated.email,
                name: updated.name,
                hasPin: true,
              },
            },
            200
          );
        }

        return errorResponse('NOT_FOUND', `Endpoint ${method} ${pathname} not found`, 404);
      }

      // -------------------------------------------------------------
      // PROTECTED GAME / LEARNING ENDPOINTS
      // (Task 7.2: API verifies authorization on every protected endpoint)
      // (Task 7.2: No child progress endpoint relies only on client-supplied player ID)
      // (Task 7.2: Parent cannot accidentally see another parent's child)
      // -------------------------------------------------------------

      // 1. POST /api/sessions/start
      if (method === 'POST' && pathname === '/api/sessions/start') {
        const auth = await getAuthContext(request, env);
        if (!auth) {
          return errorResponse(
            'UNAUTHORIZED',
            'Authentication token required to start a session',
            401
          );
        }

        let body: Record<string, unknown> = {};
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          body = {};
        }

        let targetPlayerId: string;
        if (auth.role === 'child') {
          // Strictly lock player ID to authenticated child identity
          targetPlayerId = auth.sub;
        } else {
          // Parent starting a session for one of their children
          const requestedPlayerId =
            body.playerId && typeof body.playerId === 'string' ? body.playerId.trim() : '';

          if (!requestedPlayerId) {
            return errorResponse(
              'MISSING_PLAYER_ID',
              'playerId is required for parent request',
              400
            );
          }

          const childExists = await verifyChildBelongsToParent(env.DB, requestedPlayerId, auth.sub);
          if (!childExists) {
            return errorResponse('NOT_FOUND', 'Child profile not found', 404);
          }
          targetPlayerId = requestedPlayerId;
        }

        const date =
          body.date && typeof body.date === 'string'
            ? body.date.trim()
            : new Date().toISOString().slice(0, 10);

        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          return errorResponse('INVALID_DATE_FORMAT', 'Date must be formatted as YYYY-MM-DD', 400);
        }

        const arrowsAllowed =
          typeof body.arrowsAllowed === 'number' && body.arrowsAllowed > 0
            ? body.arrowsAllowed
            : 50;

        const session = await getOrCreateSession(env.DB, targetPlayerId, date, arrowsAllowed);
        return jsonResponse({ session }, 200);
      }

      // 2. POST /api/attempts
      if (method === 'POST' && pathname === '/api/attempts') {
        const auth = await getAuthContext(request, env);
        if (!auth) {
          return errorResponse(
            'UNAUTHORIZED',
            'Authentication token required to record attempts',
            401
          );
        }

        let body: Record<string, unknown>;
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return errorResponse('MALFORMED_JSON', 'Request body must be valid JSON', 400);
        }

        if (!body || typeof body !== 'object') {
          return errorResponse('INVALID_BODY', 'Request body must be a JSON object', 400);
        }

        let targetPlayerId: string;
        if (auth.role === 'child') {
          // Strictly lock player ID to authenticated child identity
          targetPlayerId = auth.sub;
        } else {
          const playerId = body.playerId;
          if (!playerId || typeof playerId !== 'string') {
            return errorResponse('MISSING_PLAYER_ID', 'playerId is required', 400);
          }
          const childExists = await verifyChildBelongsToParent(env.DB, playerId, auth.sub);
          if (!childExists) {
            return errorResponse('NOT_FOUND', 'Child profile not found', 404);
          }
          targetPlayerId = playerId;
        }

        // Support single attempt or batch of attempts
        const attemptsToProcess: Attempt[] = [];
        if (body.attempt) {
          attemptsToProcess.push(body.attempt as Attempt);
        } else if (Array.isArray(body.attempts)) {
          attemptsToProcess.push(...(body.attempts as Attempt[]));
        } else {
          return errorResponse(
            'MISSING_ATTEMPTS',
            'Either attempt or attempts array is required',
            400
          );
        }

        if (attemptsToProcess.length === 0) {
          return errorResponse('EMPTY_ATTEMPTS', 'At least one attempt is required', 400);
        }

        // Validate all attempts before recording
        for (const [index, att] of attemptsToProcess.entries()) {
          const val = validateAttempt(att);
          if (!val.valid) {
            return errorResponse(
              'INVALID_ATTEMPT',
              `Attempt at index ${index} is invalid: ${val.error}`,
              400
            );
          }
        }

        let lastResult: { session?: DailySession; remainingArrows?: number } = {};
        let accepted = 0;

        for (const att of attemptsToProcess) {
          lastResult = await recordAttemptInDb(env.DB, targetPlayerId, att);
          accepted++;
        }

        return jsonResponse(
          {
            success: true,
            accepted,
            session: lastResult.session,
            remainingArrows: lastResult.remainingArrows,
          },
          200
        );
      }

      // 3. GET /api/sessions/today
      if (method === 'GET' && pathname === '/api/sessions/today') {
        const auth = await getAuthContext(request, env);
        if (!auth) {
          return errorResponse('UNAUTHORIZED', 'Authentication token required', 401);
        }

        let targetPlayerId: string;
        if (auth.role === 'child') {
          targetPlayerId = auth.sub;
        } else {
          const requestedPlayerId = url.searchParams.get('playerId');
          if (!requestedPlayerId) {
            return errorResponse('MISSING_PLAYER_ID', 'playerId is required for parent query', 400);
          }
          const childExists = await verifyChildBelongsToParent(env.DB, requestedPlayerId, auth.sub);
          if (!childExists) {
            return errorResponse('NOT_FOUND', 'Child profile not found', 404);
          }
          targetPlayerId = requestedPlayerId;
        }

        const date = url.searchParams.get('date') || new Date().toISOString().slice(0, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          return errorResponse('INVALID_DATE_FORMAT', 'Date must be formatted as YYYY-MM-DD', 400);
        }

        const session = await getTodaySessionFromDb(env.DB, targetPlayerId, date);
        return jsonResponse({ session }, 200);
      }

      // 4. GET /api/progress
      if (method === 'GET' && pathname === '/api/progress') {
        const auth = await getAuthContext(request, env);
        if (!auth) {
          return errorResponse(
            'UNAUTHORIZED',
            'Authentication token required to view progress',
            401
          );
        }

        let targetPlayerId: string;
        if (auth.role === 'child') {
          targetPlayerId = auth.sub;
        } else {
          const requestedPlayerId = url.searchParams.get('playerId');
          if (!requestedPlayerId) {
            return errorResponse('MISSING_PLAYER_ID', 'playerId is required for parent query', 400);
          }
          const childExists = await verifyChildBelongsToParent(env.DB, requestedPlayerId, auth.sub);
          if (!childExists) {
            return errorResponse('NOT_FOUND', 'Child profile not found', 404);
          }
          targetPlayerId = requestedPlayerId;
        }

        const date = url.searchParams.get('date') || new Date().toISOString().slice(0, 10);
        const progress = await getPlayerProgressFromDb(env.DB, targetPlayerId, date);
        return jsonResponse(progress, 200);
      }

      // PUT /api/progress/world
      if (method === 'PUT' && pathname === '/api/progress/world') {
        const auth = await getAuthContext(request, env);
        if (!auth) {
          return errorResponse(
            'UNAUTHORIZED',
            'Authentication token required to update world progression',
            401
          );
        }

        let body: Record<string, unknown>;
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return errorResponse('MALFORMED_JSON', 'Request body must be valid JSON', 400);
        }

        let targetPlayerId: string;
        if (auth.role === 'child') {
          targetPlayerId = auth.sub;
        } else {
          const playerId = body.playerId;
          if (!playerId || typeof playerId !== 'string') {
            return errorResponse('MISSING_PLAYER_ID', 'playerId is required', 400);
          }
          const childExists = await verifyChildBelongsToParent(env.DB, playerId, auth.sub);
          if (!childExists) {
            return errorResponse('NOT_FOUND', 'Child profile not found', 404);
          }
          targetPlayerId = playerId;
        }

        const worldProgression = await saveWorldProgressionToDb(env.DB, targetPlayerId, body);
        return jsonResponse({ success: true, worldProgression }, 200);
      }

      // PUT /api/progress/rewards
      if (method === 'PUT' && pathname === '/api/progress/rewards') {
        const auth = await getAuthContext(request, env);
        if (!auth) {
          return errorResponse(
            'UNAUTHORIZED',
            'Authentication token required to update rewards',
            401
          );
        }

        let body: Record<string, unknown>;
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return errorResponse('MALFORMED_JSON', 'Request body must be valid JSON', 400);
        }

        let targetPlayerId: string;
        if (auth.role === 'child') {
          targetPlayerId = auth.sub;
        } else {
          const playerId = body.playerId;
          if (!playerId || typeof playerId !== 'string') {
            return errorResponse('MISSING_PLAYER_ID', 'playerId is required', 400);
          }
          const childExists = await verifyChildBelongsToParent(env.DB, playerId, auth.sub);
          if (!childExists) {
            return errorResponse('NOT_FOUND', 'Child profile not found', 404);
          }
          targetPlayerId = playerId;
        }

        const rewards = await savePlayerRewardsToDb(env.DB, targetPlayerId, body);
        return jsonResponse({ success: true, rewards }, 200);
      }

      // 5. GET /api/recommendations
      if (method === 'GET' && pathname === '/api/recommendations') {
        const auth = await getAuthContext(request, env);
        if (!auth) {
          return errorResponse(
            'UNAUTHORIZED',
            'Authentication token required to view recommendations',
            401
          );
        }

        let targetPlayerId: string;
        if (auth.role === 'child') {
          targetPlayerId = auth.sub;
        } else {
          const requestedPlayerId = url.searchParams.get('playerId');
          if (!requestedPlayerId) {
            return errorResponse('MISSING_PLAYER_ID', 'playerId is required for parent query', 400);
          }
          const childExists = await verifyChildBelongsToParent(env.DB, requestedPlayerId, auth.sub);
          if (!childExists) {
            return errorResponse('NOT_FOUND', 'Child profile not found', 404);
          }
          targetPlayerId = requestedPlayerId;
        }

        const recommendation = await getPlayerRecommendationsFromDb(env.DB, targetPlayerId);
        return jsonResponse({ recommendation }, 200);
      }

      // If request is not under /api and env.ASSETS is available, serve static asset
      if (!pathname.startsWith('/api') && env.ASSETS) {
        return await env.ASSETS.fetch(request);
      }

      // Fallback 404 for unknown endpoints
      return errorResponse('NOT_FOUND', `Endpoint ${method} ${pathname} not found`, 404);
    } catch (err: unknown) {
      if (err instanceof DailyLimitError) {
        return errorResponse('DAILY_LIMIT_EXCEEDED', err.message, 403);
      }

      const message = err instanceof Error ? err.message : 'An unexpected server error occurred';
      return errorResponse('INTERNAL_SERVER_ERROR', message, 500);
    }
  },
};
