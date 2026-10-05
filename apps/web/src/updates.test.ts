import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('game release updates', () => {
  let serviceWorker: EventTarget & {
    register: ReturnType<typeof vi.fn>;
    controller: object | null;
  };
  let registration: EventTarget & {
    update: ReturnType<typeof vi.fn>;
    waiting: { postMessage: ReturnType<typeof vi.fn> } | null;
    installing: (EventTarget & { state: string }) | null;
  };

  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('PROD', true);
    vi.stubEnv('DEV', false);
    vi.spyOn(document, 'readyState', 'get').mockReturnValue('complete');
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    registration = Object.assign(new EventTarget(), {
      update: vi.fn().mockResolvedValue(undefined),
      waiting: null,
      installing: null,
    });
    serviceWorker = Object.assign(new EventTarget(), {
      register: vi.fn().mockResolvedValue(registration),
      controller: {},
    });
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: serviceWorker });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.useRealTimers();
    Reflect.deleteProperty(navigator, 'serviceWorker');
  });

  async function start() {
    const updates = await import('./updates');
    updates.registerServiceWorker();
    await vi.waitFor(() => expect(registration.update).toHaveBeenCalledOnce());
    return updates;
  }

  it('announces an already downloaded release to late subscribers', async () => {
    registration.waiting = { postMessage: vi.fn() };
    const updates = await start();
    const listener = vi.fn();
    updates.subscribeToUpdates(listener);
    expect(listener).toHaveBeenCalledWith(true);
    expect(registration.waiting.postMessage).not.toHaveBeenCalled();
  });

  it('checks the deployed version without cache and bypasses the automatic throttle', async () => {
    const updates = await start();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: updates.gameVersion.id }) })
    );
    await expect(updates.checkLatestVersion()).resolves.toBe('current');
    expect(fetch).toHaveBeenCalledWith(
      '/version.json',
      expect.objectContaining({ cache: 'no-store' })
    );
    registration.waiting = { postMessage: vi.fn() };
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'new-release' }),
    } as Response);
    await expect(updates.checkLatestVersion()).resolves.toBe('ready');
    expect(registration.update).toHaveBeenCalledTimes(2);
    expect(registration.waiting.postMessage).not.toHaveBeenCalled();
  });

  it('does not offer a stale reload before the new offline worker is ready', async () => {
    const updates = await start();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'new-release' }) })
    );
    await expect(updates.checkLatestVersion()).rejects.toThrow('not ready');
  });

  it('reports offline checks without claiming the game is current', async () => {
    const updates = await start();
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    await expect(updates.checkLatestVersion()).rejects.toThrow('offline');
  });

  it('announces installed updates but not the first offline installation', async () => {
    const updates = await start();
    const listener = vi.fn();
    updates.subscribeToUpdates(listener);
    const worker = Object.assign(new EventTarget(), { state: 'installing' });
    registration.installing = worker;
    registration.dispatchEvent(new Event('updatefound'));
    serviceWorker.controller = null;
    worker.state = 'installed';
    worker.dispatchEvent(new Event('statechange'));
    expect(listener).toHaveBeenLastCalledWith(false);
    serviceWorker.controller = {};
    worker.dispatchEvent(new Event('statechange'));
    expect(listener).toHaveBeenLastCalledWith(true);
  });

  it('throttles repeated checks and skips offline checks', async () => {
    const updates = await start();
    await updates.checkForUpdates();
    expect(registration.update).toHaveBeenCalledOnce();
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 31_000);
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    await updates.checkForUpdates();
    expect(registration.update).toHaveBeenCalledOnce();
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    await updates.checkForUpdates();
    expect(registration.update).toHaveBeenCalledTimes(2);
  });

  it('allows an immediate retry after a failed network check', async () => {
    registration.update.mockRejectedValueOnce(new Error('offline'));
    const updates = await start();
    await updates.checkForUpdates();
    expect(registration.update).toHaveBeenCalledTimes(2);
  });

  it('activates only on request and reports activation timeouts for retry', async () => {
    registration.waiting = { postMessage: vi.fn() };
    const updates = await start();
    vi.useFakeTimers();
    const reload = updates.reloadLatestVersion();
    const rejected = expect(reload).rejects.toThrow('could not be activated');
    expect(registration.waiting.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    await vi.advanceTimersByTimeAsync(10_000);
    await rejected;
  });

  it('reloads only after the new worker takes control', async () => {
    registration.waiting = { postMessage: vi.fn() };
    const updates = await start();
    const reloadPage = vi.fn();
    vi.stubGlobal('window', {
      setTimeout: window.setTimeout.bind(window),
      location: { reload: reloadPage },
    });
    const reload = updates.reloadLatestVersion();
    expect(reloadPage).not.toHaveBeenCalled();
    serviceWorker.dispatchEvent(new Event('controllerchange'));
    await reload;
    expect(reloadPage).toHaveBeenCalledOnce();
  });
});
