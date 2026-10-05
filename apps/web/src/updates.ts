/** Service worker revisions identify releases, including their cached game assets. */
let registration: ServiceWorkerRegistration | undefined;
let started = false;
let updateAvailable = false;
let lastCheck = -Infinity;
let pendingCheck: Promise<void> | undefined;
const listeners = new Set<(available: boolean) => void>();
const CHECK_INTERVAL_MS = 30_000;

export const gameVersion = __GAME_VERSION__;

/** Manual checks always reach the server and bypass the automatic-check throttle. */
export async function checkLatestVersion(): Promise<'current' | 'ready'> {
  if (!navigator.onLine) throw new Error('You are offline. Check again when connected.');
  if (import.meta.env.DEV) throw new Error('Update checks are available in the deployed game.');
  const response = await fetch(`${import.meta.env.BASE_URL}version.json`, {
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error('Could not check for updates. Please try again.');
  const latest: unknown = await response.json();
  if (!latest || typeof latest !== 'object' || !('id' in latest) || typeof latest.id !== 'string') {
    throw new Error('Could not check for updates. Please try again.');
  }
  if (latest.id === gameVersion.id) return 'current';
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    const previousController = navigator.serviceWorker.controller;
    const currentRegistration =
      registration ?? (await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL));
    if (!currentRegistration) throw new Error('Update is not ready yet. Please try again.');
    registration = currentRegistration;
    await pendingCheck;
    await currentRegistration.update();
    const worker = currentRegistration.installing;
    if (worker) {
      await new Promise<void>((resolve, reject) => {
        const cleanup = () => {
          clearTimeout(timeout);
          worker.removeEventListener('statechange', onStateChange);
        };
        const onStateChange = () => {
          if (worker.state === 'installed' || worker.state === 'activated') {
            cleanup();
            resolve();
          } else if (worker.state === 'redundant') {
            cleanup();
            reject(new Error('Update download failed. Please try again.'));
          }
        };
        const timeout = window.setTimeout(() => {
          cleanup();
          reject(new Error('Update is still downloading. Please check again shortly.'));
        }, 15_000);
        worker.addEventListener('statechange', onStateChange);
        onStateChange();
      });
    }
    if (!currentRegistration.waiting && navigator.serviceWorker.controller === previousController) {
      throw new Error('Update is not ready yet. Please check again shortly.');
    }
  }
  announceUpdate();
  return 'ready';
}

function announceUpdate(): void {
  updateAvailable = true;
  listeners.forEach((listener) => listener(true));
}

export function subscribeToUpdates(listener: (available: boolean) => void): () => void {
  listeners.add(listener);
  listener(updateAvailable);
  return () => {
    listeners.delete(listener);
  };
}

/** Coalesce focus/navigation events and keep offline failures out of the game UI. */
export async function checkForUpdates(): Promise<void> {
  if (!registration || !navigator.onLine) return;
  if (registration.waiting && navigator.serviceWorker.controller) announceUpdate();
  if (pendingCheck) return pendingCheck;
  if (Date.now() - lastCheck < CHECK_INTERVAL_MS) return;
  lastCheck = Date.now();
  pendingCheck = registration
    .update()
    .then(
      () => {},
      () => {
        // Retry when connectivity or focus returns, even inside the throttle interval.
        lastCheck = -Infinity;
      }
    )
    .finally(() => {
      pendingCheck = undefined;
    });
  return pendingCheck;
}

export function registerServiceWorker(): void {
  if (started || !import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  started = true;
  const register = () => {
    void navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, {
        scope: import.meta.env.BASE_URL,
        updateViaCache: 'none',
      })
      .then((result) => {
        registration = result;
        const watchInstallingWorker = () => {
          const worker = result.installing;
          if (!worker) return;
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              announceUpdate();
            }
          });
        };
        result.addEventListener('updatefound', watchInstallingWorker);
        watchInstallingWorker();
        void checkForUpdates();
      })
      .catch(() => {
        // The game remains usable when service workers are unavailable.
        started = false;
      });
  };
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}

/** Activate the fully downloaded release before reloading its cached page. */
export async function reloadLatestVersion(): Promise<void> {
  const waiting = registration?.waiting;
  if (!waiting) {
    window.location.reload();
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timeout);
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
    const onControllerChange = () => {
      cleanup();
      window.location.reload();
      resolve();
    };
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error('The update could not be activated. Please try again.'));
    }, 10_000);
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    try {
      waiting.postMessage({ type: 'SKIP_WAITING' });
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
}
