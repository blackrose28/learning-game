import { useEffect, useState } from 'react';
import { checkForUpdates, reloadLatestVersion, subscribeToUpdates } from '../updates';
import './UpdatePrompt.css';

export function UpdatePrompt({ activeTab }: { activeTab: string }) {
  const [available, setAvailable] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => subscribeToUpdates(setAvailable), []);

  useEffect(() => {
    const check = () => {
      if (document.visibilityState === 'visible') void checkForUpdates();
    };
    window.addEventListener('focus', check);
    window.addEventListener('online', check);
    document.addEventListener('visibilitychange', check);
    return () => {
      window.removeEventListener('focus', check);
      window.removeEventListener('online', check);
      document.removeEventListener('visibilitychange', check);
    };
  }, []);

  useEffect(() => {
    void checkForUpdates();
  }, [activeTab]);

  if (!available) return null;

  const reload = async () => {
    setReloading(true);
    setError(false);
    try {
      await reloadLatestVersion();
    } catch {
      setError(true);
      setReloading(false);
    }
  };

  return (
    <div className="game-update-banner" role="status">
      <span>
        {error ? 'Update could not load. Please try again.' : 'A new game version is ready!'}
      </span>
      <button type="button" onClick={() => void reload()} disabled={reloading}>
        {reloading ? 'Reloading…' : 'Reload to update'}
      </button>
    </div>
  );
}
