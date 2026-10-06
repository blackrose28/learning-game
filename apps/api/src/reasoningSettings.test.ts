import { describe, expect, it } from 'vitest';
import worker from './index';
import {
  createTestChildToken,
  createTestD1Database,
  createTestParentToken,
  TEST_JWT_SECRET,
} from './test-utils';

describe('per-child reasoning opt-in', () => {
  it('defaults off, persists across profile reads/login, and survives unrelated changes', async () => {
    const env = { DB: createTestD1Database(), JWT_SECRET: TEST_JWT_SECRET };
    const token = await createTestParentToken();
    const update = (body: unknown) =>
      worker.fetch(
        new Request('https://test/api/parent/children/player-local', {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }),
        env
      );
    const enabled = { schemaVersion: 1, enabledFamilies: ['instruction_chain'] };
    const initial = await update({ name: 'Alex' });
    expect(await initial.json()).toMatchObject({
      child: { reasoningSettings: { schemaVersion: 1, enabledFamilies: [] } },
    });
    expect((await update({ reasoningSettings: enabled })).status).toBe(200);
    const rename = await update({
      name: 'Reasoner',
      animationSpeed: 'slow',
      disabledSkills: ['make_10'],
    });
    expect(await rename.json()).toMatchObject({
      child: { reasoningSettings: enabled, animationSpeed: 'slow', disabledSkills: ['make_10'] },
    });
    const login = await worker.fetch(
      new Request('https://test/api/auth/child/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId: 'player-local', pin: '1234' }),
      }),
      env
    );
    expect(await login.json()).toMatchObject({ child: { reasoningSettings: enabled } });
    const profiles = await worker.fetch(new Request('https://test/api/auth/child/profiles'), env);
    const children = (
      (await profiles.json()) as { children: { id: string; reasoningSettings: unknown }[] }
    ).children;
    expect(children.find((child) => child.id === 'player-local')?.reasoningSettings).toEqual(
      enabled
    );
    expect(children.find((child) => child.id === 'child_mia')?.reasoningSettings).toEqual({
      schemaVersion: 1,
      enabledFamilies: [],
    });
    expect(
      (await update({ reasoningSettings: { schemaVersion: 1, enabledFamilies: [] } })).status
    ).toBe(200);
  });

  it('upgrades an existing child to reasoning off without touching other preferences', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const dir = path.resolve(__dirname, '../migrations');
    const db = createTestD1Database(false);
    const apply = async (version: number) => {
      const file = fs
        .readdirSync(dir)
        .find((name) => name.startsWith(String(version).padStart(4, '0')))!;
      await db.exec(fs.readFileSync(path.resolve(dir, file), 'utf8'));
    };
    for (let version = 1; version <= 6; version++) await apply(version);
    await db
      .prepare(
        `INSERT INTO players (id, name, created_at, updated_at, disabled_skills, animation_speed)
         VALUES ('legacy-child', 'Legacy', '2026-09-01T00:00:00Z', '2026-09-01T00:00:00Z', '["make_10"]', 'slow')`
      )
      .run();

    await apply(7);

    const row = await db
      .prepare(
        'SELECT reasoning_settings, disabled_skills, animation_speed FROM players WHERE id = ?'
      )
      .bind('legacy-child')
      .first<{ reasoning_settings: string; disabled_skills: string; animation_speed: string }>();
    expect(JSON.parse(row!.reasoning_settings)).toEqual({ schemaVersion: 1, enabledFamilies: [] });
    expect(row!.disabled_skills).toBe('["make_10"]');
    expect(row!.animation_speed).toBe('slow');
  });

  it('stores several enabled families and keeps single-family settings readable', async () => {
    const env = { DB: createTestD1Database(), JWT_SECRET: TEST_JWT_SECRET };
    const token = await createTestParentToken();
    const update = (reasoningSettings: unknown) =>
      worker.fetch(
        new Request('https://test/api/parent/children/player-local', {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ reasoningSettings }),
        }),
        env
      );
    const all = {
      schemaVersion: 1,
      enabledFamilies: [
        'instruction_chain',
        'daily_collection',
        'unknown_start',
        'growing_gap_sequence',
        'max_sum_digit_cards',
      ],
    };
    expect(await (await update(all)).json()).toMatchObject({ child: { reasoningSettings: all } });
    const stories = { schemaVersion: 1, enabledFamilies: ['unknown_start'] };
    expect(await (await update(stories)).json()).toMatchObject({
      child: { reasoningSettings: stories },
    });
    const adventure = {
      schemaVersion: 1,
      enabledFamilies: ['unknown_start'],
      adventureEnabled: true,
    };
    expect(await (await update(adventure)).json()).toMatchObject({
      child: { reasoningSettings: adventure },
    });
    expect(
      (await update({ schemaVersion: 1, enabledFamilies: ['multiplication_tables'] })).status
    ).toBe(400);
  });

  it('rejects invalid settings and child edits', async () => {
    const env = { DB: createTestD1Database(), JWT_SECRET: TEST_JWT_SECRET };
    const parent = await createTestParentToken();
    for (const reasoningSettings of [
      null,
      'bad',
      {},
      { schemaVersion: 2, enabledFamilies: [] },
      { schemaVersion: 1, enabledFamilies: ['unknown'] },
      { schemaVersion: 1, enabledFamilies: ['instruction_chain', 'instruction_chain'] },
      { schemaVersion: 1, enabledFamilies: [], adventureEnabled: 'yes' },
    ]) {
      expect(
        (
          await worker.fetch(
            new Request('https://test/api/parent/children/player-local', {
              method: 'PUT',
              headers: { Authorization: `Bearer ${parent}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ reasoningSettings }),
            }),
            env
          )
        ).status
      ).toBe(400);
    }
    const token = await createTestChildToken();
    expect(
      (
        await worker.fetch(
          new Request('https://test/api/parent/children/player-local', {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              reasoningSettings: { schemaVersion: 1, enabledFamilies: ['instruction_chain'] },
            }),
          }),
          env
        )
      ).status
    ).toBe(403);
  });
});
