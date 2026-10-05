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
