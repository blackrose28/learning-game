/**
 * PWA & Service Worker utilities for Math Archer
 */

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const installListeners = new Set<(canInstall: boolean) => void>();

// Register beforeinstallprompt event if running in browser
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    installListeners.forEach((fn) => fn(true));
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    installListeners.forEach((fn) => fn(false));
  });
}

/**
 * Checks if the app is currently running in standalone (installed PWA) mode.
 */
export function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;

  // iOS Safari standalone check
  const nav = window.navigator as unknown as { standalone?: boolean };
  if (nav.standalone === true) return true;

  // Standard display-mode check
  if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }

  // Fallback check for window.location query param
  if (window.location && window.location.search.includes('standalone=true')) {
    return true;
  }

  return false;
}

/**
 * Returns whether an installation prompt is available.
 */
export function canInstallPrompt(): boolean {
  return deferredPrompt !== null;
}

/**
 * Subscribes to changes in installation readiness.
 */
export function subscribeToInstallPrompt(callback: (canInstall: boolean) => void): () => void {
  installListeners.add(callback);
  callback(deferredPrompt !== null);
  return () => {
    installListeners.delete(callback);
  };
}

/**
 * Triggers the native browser install prompt dialog.
 */
export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferredPrompt) {
    return 'unavailable';
  }

  try {
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    installListeners.forEach((fn) => fn(false));
    return outcome;
  } catch {
    return 'unavailable';
  }
}

/**
 * Safe Service Worker registration.
 */
export function registerServiceWorker(): void {
  if (typeof window === 'undefined') return;

  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          // Check for SW updates periodically or on navigation
          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed') {
                  if (navigator.serviceWorker.controller) {
                    // New content is available once all tabs are closed
                    window.dispatchEvent(new CustomEvent('pwa-update-available'));
                  }
                }
              };
            }
          };
        })
        .catch(() => {
          // Service worker registration skipped or failed silently
        });
    });
  }
}
