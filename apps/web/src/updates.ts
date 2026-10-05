/** Service worker revisions identify releases, including their cached game assets. */
let registration: ServiceWorkerRegistration | undefined;
let started = false;
let updateAvailable = false;
let lastCheck = -Infinity;
let pendingCheck: Promise<void> | undefined;
const listeners = new Set<(available: boolean) => void>();
const CHECK_INTERVAL_MS = 30_000;

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
