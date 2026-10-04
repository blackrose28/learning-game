import { describe, it, expect } from 'vitest';
import { getAllSkills } from '@math-archer/learning-engine';
import worker from './index';
import {
  createTestD1Database,
  createTestParentToken,
  createTestChildToken,
  TEST_JWT_SECRET,
} from './test-utils';

describe('Parent skill preferences', () => {
  it('persists per child, returns them on login, and preserves them when editing other fields', async () => {
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
    expect((await update({ disabledSkills: ['addition_within_10'] })).status).toBe(200);
    const renamed = await update({ name: 'Archer' });
    expect(
      ((await renamed.json()) as { child: { disabledSkills: string[] } }).child.disabledSkills
    ).toEqual(['addition_within_10']);
    const login = await worker.fetch(
      new Request('https://test/api/auth/child/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId: 'player-local', pin: '1234' }),
      }),
      env
    );
    expect(login.status).toBe(200);
    expect(
      ((await login.json()) as { child: { disabledSkills: string[] } }).child.disabledSkills
    ).toEqual(['addition_within_10']);
    expect((await update({ disabledSkills: [] })).status).toBe(200);
    for (const disabledSkills of [
      getAllSkills().map((s) => s.id),
      ['unknown'],
      ['make_10', 'make_10'],
      null,
      'make_10',
    ]) {
      expect((await update({ disabledSkills })).status).toBe(400);
    }
    const childToken = await createTestChildToken();
    const denied = await worker.fetch(
      new Request('https://test/api/parent/children/player-local', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${childToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ disabledSkills: ['make_10'] }),
      }),
      env
    );
    expect(denied.status).toBe(403);
  });
});
