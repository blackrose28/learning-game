import type { Env, ErrorResponse } from './types';
import {
  DailyLimitError,
  getOrCreateSession,
  getTodaySessionFromDb,
  recordAttemptInDb,
  getPlayerProgressFromDb,
  getPlayerRecommendationsFromDb,
} from './db';
import type { Attempt, DailySession } from '@math-archer/learning-engine';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

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
      // 1. POST /api/sessions/start
      if (method === 'POST' && pathname === '/api/sessions/start') {
        let body: Record<string, unknown> = {};
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          body = {};
        }

        const playerId = (body.playerId && typeof body.playerId === 'string')
          ? body.playerId.trim()
          : 'player-local';

        if (!playerId) {
          return errorResponse('INVALID_PLAYER_ID', 'Player ID cannot be empty', 400);
        }

        const date = (body.date && typeof body.date === 'string')
          ? body.date.trim()
          : new Date().toISOString().slice(0, 10);

        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          return errorResponse('INVALID_DATE_FORMAT', 'Date must be formatted as YYYY-MM-DD', 400);
        }

        const arrowsAllowed = typeof body.arrowsAllowed === 'number' && body.arrowsAllowed > 0
          ? body.arrowsAllowed
          : 50;

        const session = await getOrCreateSession(env.DB, playerId, date, arrowsAllowed);
        return jsonResponse({ session }, 200);
      }

      // 2. POST /api/attempts
      if (method === 'POST' && pathname === '/api/attempts') {
        let body: Record<string, unknown>;
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return errorResponse('MALFORMED_JSON', 'Request body must be valid JSON', 400);
        }

        if (!body || typeof body !== 'object') {
          return errorResponse('INVALID_BODY', 'Request body must be a JSON object', 400);
        }

        const playerId = body.playerId;
        if (!playerId || typeof playerId !== 'string') {
          return errorResponse('MISSING_PLAYER_ID', 'playerId is required', 400);
        }

        // Support single attempt or batch of attempts
        const attemptsToProcess: Attempt[] = [];
        if (body.attempt) {
          attemptsToProcess.push(body.attempt as Attempt);
        } else if (Array.isArray(body.attempts)) {
          attemptsToProcess.push(...(body.attempts as Attempt[]));
        } else {
          return errorResponse('MISSING_ATTEMPTS', 'Either attempt or attempts array is required', 400);
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
          lastResult = await recordAttemptInDb(env.DB, playerId, att);
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
        const playerId = url.searchParams.get('playerId') || 'player-local';
        const date = url.searchParams.get('date') || new Date().toISOString().slice(0, 10);

        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          return errorResponse('INVALID_DATE_FORMAT', 'Date must be formatted as YYYY-MM-DD', 400);
        }

        const session = await getTodaySessionFromDb(env.DB, playerId, date);
        return jsonResponse({ session }, 200);
      }

      // 4. GET /api/progress
      if (method === 'GET' && pathname === '/api/progress') {
        const playerId = url.searchParams.get('playerId') || 'player-local';
        const date = url.searchParams.get('date') || new Date().toISOString().slice(0, 10);

        const progress = await getPlayerProgressFromDb(env.DB, playerId, date);
        return jsonResponse(progress, 200);
      }

      // 5. GET /api/recommendations
      if (method === 'GET' && pathname === '/api/recommendations') {
        const playerId = url.searchParams.get('playerId') || 'player-local';
        const recommendation = await getPlayerRecommendationsFromDb(env.DB, playerId);
        return jsonResponse({ recommendation }, 200);
      }

      // Fallback 404
      return errorResponse(
        'NOT_FOUND',
        `Endpoint ${method} ${pathname} not found`,
        404
      );
    } catch (err: unknown) {
      if (err instanceof DailyLimitError) {
        return errorResponse('DAILY_LIMIT_EXCEEDED', err.message, 403);
      }

      const message = err instanceof Error ? err.message : 'An unexpected server error occurred';
      return errorResponse('INTERNAL_SERVER_ERROR', message, 500);
    }
  },
};
