import React, { useState, useEffect } from 'react';
import {
  isStandaloneMode,
  canInstallPrompt,
  subscribeToInstallPrompt,
  promptInstall,
} from '../pwa';
import './InstallPrompt.css';

export interface InstallPromptProps {
  forceShow?: boolean;
}

export const InstallPrompt: React.FC<InstallPromptProps> = ({ forceShow = false }) => {
  const [standalone, setStandalone] = useState<boolean>(() => isStandaloneMode());
  const [canInstall, setCanInstall] = useState<boolean>(() => canInstallPrompt());
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('math_archer_pwa_dismissed') === 'true';
    }
    return false;
  });
  const [installing, setInstalling] = useState<boolean>(false);

  useEffect(() => {
    setStandalone(isStandaloneMode());
    const unsubscribe = subscribeToInstallPrompt((available) => {
      setCanInstall(available);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  if (dismissed) {
    return null;
  }

  if (standalone && !forceShow) {
    return (
      <div className="standalone-badge" data-testid="standalone-badge">
        <span>⚡</span>
        <span>App Mode</span>
      </div>
    );
  }

  // Show if prompt is available, or if forceShow is enabled
  if (!canInstall && !forceShow) {
    return null;
  }

  const handleInstallClick = async () => {
    setInstalling(true);
    try {
      const outcome = await promptInstall();
      if (outcome === 'accepted') {
        setDismissed(true);
      }
    } finally {
      setInstalling(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem('math_archer_pwa_dismissed', 'true');
    } catch {
      // ignore
    }
  };

  return (
    <aside
      className="install-prompt-banner"
      role="region"
      aria-label="Install Math Archer"
      data-testid="pwa-install-banner"
    >
      <div className="install-prompt-content">
        <span className="install-prompt-icon" aria-hidden="true">
          🏹
        </span>
        <div className="install-prompt-text">
          <span className="install-prompt-title">Install Math Archer</span>
          <span className="install-prompt-desc">
            Play offline and launch full-screen from your home screen!
          </span>
        </div>
      </div>
      <div className="install-prompt-actions">
        <button
          type="button"
          className="install-btn"
          onClick={handleInstallClick}
          disabled={installing}
          data-testid="pwa-install-btn"
        >
          <span>📲</span>
          <span>{installing ? 'Installing...' : 'Install'}</span>
        </button>
        <button
          type="button"
          className="install-dismiss-btn"
          onClick={handleDismiss}
          aria-label="Dismiss install prompt"
          data-testid="pwa-dismiss-btn"
        >
          ×
        </button>
      </div>
    </aside>
  );
};
