import { describe, it, expect } from 'vitest';
import worker from './index';
import {
  createTestD1Database,
  createTestParentToken,
  createTestChildToken,
  TEST_JWT_SECRET,
} from './test-utils';

describe('Per-child animation speed', () => {
  it('persists speed, keeps other children fast, and preserves speed when renaming', async () => {
    const env = { DB: createTestD1Database(), JWT_SECRET: TEST_JWT_SECRET };
    const token = await createTestParentToken();
    const request = (path: string, method = 'GET', body?: unknown) =>
      worker.fetch(
        new Request(`https://test/api/${path}`, {
          method,
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        }),
        env
      );
    const created = await request('parent/children', 'POST', { name: 'Second child' });
    expect(created.status).toBe(201);
    const secondId = ((await created.json()) as { child: { id: string } }).child.id;
    for (const animationSpeed of ['slow', 'normal', 'fast', 'slow']) {
      const response = await request('parent/children/player-local', 'PUT', { animationSpeed });
      expect(response.status).toBe(200);
      expect(
        ((await response.json()) as { child: { animationSpeed: string } }).child.animationSpeed
      ).toBe(animationSpeed);
    }
    const renamed = await request('parent/children/player-local', 'PUT', { name: 'Archer' });
    expect(
      ((await renamed.json()) as { child: { animationSpeed: string } }).child.animationSpeed
    ).toBe('slow');
    const profiles = await request('auth/child/profiles');
    const children = (
      (await profiles.json()) as { children: { id: string; animationSpeed: string }[] }
    ).children;
    expect(children.find((c) => c.id === secondId)?.animationSpeed).toBe('fast');
    const login = await request('auth/child/login', 'POST', {
      childId: 'player-local',
      pin: '1234',
    });
    expect(
      ((await login.json()) as { child: { animationSpeed: string } }).child.animationSpeed
    ).toBe('slow');
  });

  it('rejects unsupported speeds and child attempts to change them', async () => {
    const env = { DB: createTestD1Database(), JWT_SECRET: TEST_JWT_SECRET };
    const token = await createTestParentToken();
    for (const animationSpeed of [null, 500, 'turbo', {}, ['fast']]) {
      const response = await worker.fetch(
        new Request('https://test/api/parent/children/player-local', {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ animationSpeed }),
        }),
        env
      );
      expect(response.status).toBe(400);
    }
    const childToken = await createTestChildToken();
    const response = await worker.fetch(
      new Request('https://test/api/parent/children/player-local', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${childToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ animationSpeed: 'slow' }),
      }),
      env
    );
    expect(response.status).toBe(403);
  });
});
