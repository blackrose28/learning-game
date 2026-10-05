import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const mockMeta: D1Meta = {
  duration: 0,
  size_after: 0,
  rows_read: 0,
  rows_written: 0,
  last_row_id: 0,
  changed_db: false,
  changes: 0,
};

import { signToken } from './auth';

export const TEST_JWT_SECRET = 'test-jwt-secret-key-12345';

export function createTestD1Database(applyMigration = true): D1Database {
  const sqlite = new DatabaseSync(':memory:');

  if (applyMigration) {
    const migration1 = fs.readFileSync(
      path.resolve(__dirname, '../migrations/0001_initial_schema.sql'),
      'utf8'
    );
    sqlite.exec(migration1);
    const migration2Path = path.resolve(__dirname, '../migrations/0002_auth_and_profiles.sql');
    if (fs.existsSync(migration2Path)) {
      const migration2 = fs.readFileSync(migration2Path, 'utf8');
      sqlite.exec(migration2);
    }
    const migration3Path = path.resolve(__dirname, '../migrations/0003_world_and_rewards.sql');
    if (fs.existsSync(migration3Path)) {
      const migration3 = fs.readFileSync(migration3Path, 'utf8');
      sqlite.exec(migration3);
    }
    sqlite.exec(
      fs.readFileSync(path.resolve(__dirname, '../migrations/0004_skill_preferences.sql'), 'utf8')
    );
    sqlite.exec(
      fs.readFileSync(path.resolve(__dirname, '../migrations/0005_animation_speed.sql'), 'utf8')
    );
    sqlite.exec(
      fs.readFileSync(path.resolve(__dirname, '../migrations/0006_mission_attempts.sql'), 'utf8')
    );
    sqlite.exec(
      fs.readFileSync(path.resolve(__dirname, '../migrations/0007_reasoning_settings.sql'), 'utf8')
    );
  }

  const createPreparedStatement = (
    query: string,
    boundValues: unknown[] = []
  ): D1PreparedStatement => {
    return {
      bind(...values: unknown[]) {
        return createPreparedStatement(query, values);
      },
      async first<T = unknown>(colName?: string): Promise<T | null> {
        const stmt = sqlite.prepare(query);
        const row = stmt.get(...(boundValues as (string | number | bigint | boolean | null)[])) as
          Record<string, unknown> | undefined;
        if (!row) return null;
        if (colName) return (row[colName] ?? null) as T;
        return row as T;
      },
      async all<T = unknown>(): Promise<D1Result<T>> {
        const stmt = sqlite.prepare(query);
        const results = stmt.all(
          ...(boundValues as (string | number | bigint | boolean | null)[])
        ) as T[];
        return {
          results,
          success: true,
          meta: mockMeta,
        };
      },
      async run<T = Record<string, unknown>>(): Promise<D1Result<T>> {
        const stmt = sqlite.prepare(query);
        stmt.run(...(boundValues as (string | number | bigint | boolean | null)[]));
        return {
          results: [],
          success: true,
          meta: mockMeta,
        };
      },
      async raw<T = unknown[]>(_options?: unknown): Promise<T[]> {
        const stmt = sqlite.prepare(query);
        const rows = stmt.all(...(boundValues as (string | number | bigint | boolean | null)[]));
        return rows.map((r) => Object.values(r as Record<string, unknown>)) as T[];
      },
    };
  };

  const d1: D1Database = {
    prepare(query: string): D1PreparedStatement {
      return createPreparedStatement(query);
    },
    async dump(): Promise<ArrayBuffer> {
      throw new Error('dump() is not supported in in-memory test database');
    },
    async batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
      const results: D1Result<T>[] = [];
      sqlite.exec('BEGIN TRANSACTION');
      try {
        for (const stmt of statements) {
          const res = await stmt.all<T>();
          results.push(res);
        }
        sqlite.exec('COMMIT');
        return results;
      } catch (e) {
        sqlite.exec('ROLLBACK');
        throw e;
      }
    },
    async exec(query: string): Promise<D1ExecResult> {
      sqlite.exec(query);
      return {
        count: 0,
        duration: 0,
      };
    },
    withSession() {
      return d1;
    },
  };

  return d1;
}

export async function createTestParentToken(
  parentId = 'parent_default',
  email = 'parent@math-archer.local',
  name = 'Demo Parent'
): Promise<string> {
  return await signToken(
    {
      sub: parentId,
      role: 'parent',
      email,
      name,
      exp: Math.floor(Date.now() / 1000) + 86400,
    },
    TEST_JWT_SECRET
  );
}

export async function createTestChildToken(
  childId = 'player-local',
  name = 'Alex',
  parentId = 'parent_default'
): Promise<string> {
  return await signToken(
    {
      sub: childId,
      role: 'child',
      name,
      parentId,
      exp: Math.floor(Date.now() / 1000) + 86400,
    },
    TEST_JWT_SECRET
  );
}
