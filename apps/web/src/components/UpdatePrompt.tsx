import { useEffect, useState } from 'react';
import {
  checkForUpdates,
  checkLatestVersion,
  gameVersion,
  reloadLatestVersion,
  subscribeToUpdates,
} from '../updates';
import './UpdatePrompt.css';

export function UpdatePrompt({ activeTab }: { activeTab: string }) {
  const [available, setAvailable] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState('Click the version to check for updates.');

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

  const check = async () => {
    setChecking(true);
    setMessage('Checking for updates…');
    try {
      const result = await checkLatestVersion();
      if (result === 'ready') setAvailable(true);
      setMessage(
        result === 'current' ? 'You have the latest version.' : 'A new game version is ready!'
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Could not check for updates. Please try again.'
      );
    } finally {
      setChecking(false);
    }
  };

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
    <div className="game-update-banner">
      <button
        className="game-version-button"
        type="button"
        onClick={() => void check()}
        disabled={checking || reloading}
        aria-label={`Check for updates, current version ${gameVersion.label}`}
      >
        {gameVersion.label}
      </button>
      <span role="status">
        {error
          ? 'Update could not load. Please try again.'
          : available
            ? 'A new game version is ready!'
            : message}
      </span>
      {available && (
        <button type="button" onClick={() => void reload()} disabled={reloading}>
          {reloading ? 'Reloading…' : 'Reload to update'}
        </button>
      )}
    </div>
  );
}
