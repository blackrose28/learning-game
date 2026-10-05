import { restoreMissionAttempt, compareMissionAttempts } from '@math-archer/learning-engine';
import type { MissionAttemptPage, MissionSaveResponse, StoredMissionAttempt } from './types';

interface MissionRow {
  player_id: string;
  id: string;
  schema_version: number;
  payload: string;
  revision: number;
  started_at: string;
  completed_at: string | null;
}

type MissionDatabase = D1Database | D1DatabaseSession;

export class MissionConflictError extends Error {
  constructor(public readonly current: StoredMissionAttempt) {
    super('The mission attempt has conflicting evidence; the saved attempt was preserved');
    this.name = 'MissionConflictError';
  }
}

export class MissionBusyError extends Error {
  constructor() {
    super('The mission attempt changed while saving; retry this request');
    this.name = 'MissionBusyError';
  }
}

function restoreRow(row: MissionRow): StoredMissionAttempt {
  if (row.schema_version !== 1) throw new Error('Unsupported stored mission version');
  const attempt = restoreMissionAttempt(JSON.parse(row.payload));
  if (
    attempt.playerId !== row.player_id ||
    attempt.id !== row.id ||
    attempt.startedAt !== row.started_at ||
    (attempt.completedAt ?? null) !== row.completed_at
  ) {
    throw new Error('Stored mission identity or completion metadata does not match');
  }
  return { attempt, revision: row.revision };
}

export async function getMissionAttemptFromDb(
  db: MissionDatabase,
  playerId: string,
  attemptId: string
): Promise<StoredMissionAttempt | null> {
  const row = await db
    .prepare('SELECT * FROM mission_attempts WHERE player_id = ? AND id = ?')
    .bind(playerId, attemptId)
    .first<MissionRow>();
  return row ? restoreRow(row) : null;
}

/** Append-only snapshots, keyed by child and attempt ID; CAS guards concurrent writers. */
export async function saveMissionAttemptInDb(
  db: D1Database,
  value: unknown
): Promise<MissionSaveResponse> {
  const incoming = restoreMissionAttempt(value);
  const payload = JSON.stringify(incoming);
  // Start on the primary and keep retry reads in the same sequentially consistent session.
  const session = db.withSession('first-primary');
  for (let retry = 0; retry < 5; retry++) {
    const current = await getMissionAttemptFromDb(session, incoming.playerId, incoming.id);
    if (!current) {
      const inserted = await session
        .prepare(
          `INSERT INTO mission_attempts
          (player_id, id, schema_version, payload, revision, started_at, completed_at, updated_at)
         VALUES (?, ?, 1, ?, 1, ?, ?, ?)
         ON CONFLICT(player_id, id) DO NOTHING RETURNING revision`
        )
        .bind(
          incoming.playerId,
          incoming.id,
          payload,
          incoming.startedAt,
          incoming.completedAt ?? null,
          new Date().toISOString()
        )
        .first<{ revision: number }>();
      if (inserted)
        return {
          schemaVersion: 1,
          disposition: 'created',
          attempt: incoming,
          revision: inserted.revision,
        };
      continue;
    }
    const comparison = compareMissionAttempts(incoming, current.attempt);
    if (comparison === 'conflict') throw new MissionConflictError(current);
    if (comparison === 'stale' || comparison === 'unchanged') {
      return { schemaVersion: 1, disposition: comparison, ...current };
    }
    const updated = await session
      .prepare(
        `UPDATE mission_attempts SET payload = ?, revision = revision + 1,
         completed_at = ?, updated_at = ?
       WHERE player_id = ? AND id = ? AND revision = ? RETURNING revision`
      )
      .bind(
        payload,
        incoming.completedAt ?? null,
        new Date().toISOString(),
        incoming.playerId,
        incoming.id,
        current.revision
      )
      .first<{ revision: number }>();
    if (updated)
      return {
        schemaVersion: 1,
        disposition: 'advanced',
        attempt: incoming,
        revision: updated.revision,
      };
  }
  throw new MissionBusyError();
}

export async function listMissionAttemptsFromDb(
  db: MissionDatabase,
  playerId: string,
  limit: number,
  cursor?: { startedAt: string; attemptId: string }
): Promise<MissionAttemptPage> {
  const rows = await db
    .prepare(
      `SELECT * FROM mission_attempts WHERE player_id = ?
       AND (started_at > ? OR (started_at = ? AND id > ?))
     ORDER BY started_at ASC, id ASC LIMIT ?`
    )
    .bind(
      playerId,
      cursor?.startedAt ?? '',
      cursor?.startedAt ?? '',
      cursor?.attemptId ?? '',
      limit + 1
    )
    .all<MissionRow>();
  const hasMore = rows.results.length > limit;
  const page = rows.results.slice(0, limit);
  const last = page.at(-1);
  return {
    schemaVersion: 1,
    attempts: page.map(restoreRow),
    nextCursor: hasMore && last ? { startedAt: last.started_at, attemptId: last.id } : null,
  };
}
