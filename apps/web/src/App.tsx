import React, { useState, useEffect } from 'react';
import {
  getEngineInfo,
  isReasoningSettings,
  type MissionFamily,
  solveExpression,
  getAllCurriculumLevels,
  getSkillsForLevel,
  loadLocalProgress,
  clearLocalProgress,
  type LocalProgress,
} from '@math-archer/learning-engine';
import { ReasoningTraining } from './components/ReasoningTraining';
import { GameScreen } from './components/GameScreen';
import { ParentDashboard } from './components/ParentDashboard';
import { ParentGate } from './components/ParentGate';
import { ChildProfilePicker, AVATAR_MAP } from './components/ChildProfilePicker';
import { InstallPrompt } from './components/InstallPrompt';
import { UpdatePrompt } from './components/UpdatePrompt';
import { WorldMap } from './components/WorldMap';
import { RewardsScreen } from './components/RewardsScreen';
import { AuthProvider, useAuth } from './context/AuthContext';
import type { MathArcherApiClient } from './api/client';
import { useGamepad, XboxButton } from './input/useGamepad';
import { hydratePlayerProgress, syncMissionAttempts } from './sync';
import { loadReasoningSettings, saveReasoningSettings } from './reasoningPreferences';
import { audioFx } from './audio/AudioFx';
import './App.css';

const APP_TABS = ['game', 'world', 'rewards', 'dashboard', 'history', 'curriculum'] as const;

export const AppContent: React.FC = () => {
  const { activeChild, isParentUnlocked, apiClient, isAuthenticated, authToken } = useAuth();
  const [activeTab, setActiveTab] = useState<
    'game' | 'world' | 'rewards' | 'dashboard' | 'history' | 'curriculum'
  >('game');
  const [progress, setProgress] = useState<LocalProgress>(() => loadLocalProgress());
  const [syncTick, setSyncTick] = useState<number>(0);
  const [showChildPicker, setShowChildPicker] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(() => audioFx.getIsMuted());
  const [reasoningOpen, setReasoningOpen] = useState(false);
  const [returnToTraining, setReturnToTraining] = useState(false);
  let reasoningFamilies: MissionFamily[] = [];
  try {
    const settings = activeChild.reasoningSettings ?? loadReasoningSettings(activeChild.id);
    if (isReasoningSettings(settings)) reasoningFamilies = settings.enabledFamilies;
  } catch {
    /* Preserve unreadable preferences and keep the activity disabled. */
  }
  const reasoningEnabled = reasoningFamilies.length > 0;
  useEffect(() => {
    setReasoningOpen(false);
    setReturnToTraining(false);
  }, [activeChild.id]);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

  // Keep mute state in sync with AudioFx
  useEffect(() => {
    return audioFx.subscribe((muted) => {
      setIsMuted(muted);
    });
  }, []);

  // Close menu on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleToggleMute = () => {
    audioFx.setMuted(!isMuted);
  };
  const engineInfo = getEngineInfo();
  const curriculumLevels = getAllCurriculumLevels();
  const [sampleExpression] = useState({ left: 8, right: 7, op: 'add' as const });

  // Startup, auth completion, and profile switch cloud hydration
  useEffect(() => {
    if (!isAuthenticated) {
      setProgress(loadLocalProgress(activeChild.id));
      return;
    }
    let isMounted = true;
    hydratePlayerProgress(activeChild.id, apiClient).then(() => {
      if (isMounted) {
        setProgress(loadLocalProgress(activeChild.id));
      }
    });
    return () => {
      isMounted = false;
    };
  }, [activeChild.id, apiClient, isAuthenticated]);

  useEffect(() => {
    if (isReasoningSettings(activeChild.reasoningSettings)) {
      try {
        saveReasoningSettings(activeChild.id, activeChild.reasoningSettings);
      } catch {
        /* The authenticated profile still supplies preferences if local storage is unavailable. */
      }
    }
  }, [activeChild.id, activeChild.reasoningSettings]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const sync = () => {
      void syncMissionAttempts(activeChild.id, apiClient);
    };
    const visible = () => {
      if (document.visibilityState === 'visible') sync();
    };
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('focus', sync);
    document.addEventListener('visibilitychange', visible);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('focus', sync);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [activeChild.id, apiClient, isAuthenticated, authToken]);

  const handleSwitchTab = (
    tab: 'game' | 'world' | 'rewards' | 'dashboard' | 'history' | 'curriculum'
  ) => {
    if (tab === 'history' || tab === 'dashboard') {
      setProgress(loadLocalProgress(activeChild.id));
    }
    setSyncTick((t) => t + 1);
    setActiveTab(tab);
  };

  const controllerState = useGamepad({
    enabled: true,
    onButtonDown: (btn) => {
      if (btn === XboxButton.LB) {
        setSyncTick((t) => t + 1);
        setActiveTab((curr) => {
          const idx = APP_TABS.indexOf(curr);
          const prevIdx = (idx - 1 + APP_TABS.length) % APP_TABS.length;
          const nextTab = APP_TABS[prevIdx];
          if (nextTab === 'history' || nextTab === 'dashboard') {
            setProgress(loadLocalProgress(activeChild.id));
          }
          return nextTab;
        });
      } else if (btn === XboxButton.RB) {
        setSyncTick((t) => t + 1);
        setActiveTab((curr) => {
          const idx = APP_TABS.indexOf(curr);
          const nextIdx = (idx + 1) % APP_TABS.length;
          const nextTab = APP_TABS[nextIdx];
          if (nextTab === 'history' || nextTab === 'dashboard') {
            setProgress(loadLocalProgress(activeChild.id));
          }
          return nextTab;
        });
      } else if (btn === XboxButton.Menu) {
        setIsMenuOpen((prev) => !prev);
      } else if (btn === XboxButton.B && isMenuOpen) {
        setIsMenuOpen(false);
      }
    },
  });

  const handleClearHistory = () => {
    clearLocalProgress();
    setProgress(loadLocalProgress());
  };

  const result = solveExpression(
    sampleExpression.left,
    sampleExpression.right,
    sampleExpression.op
  );

  return (
    <main className="app-main-container">
      <InstallPrompt />
      <UpdatePrompt activeTab={activeTab} />
      <header className="app-header">
        <div className="app-header-brand">
          <h1 className="app-title">🏹 Math Archer</h1>
        </div>

        {/* Main Tab Navigation: Streamlined Primary Game Modes */}
        <nav className="app-nav" aria-label="Game Modes">
          {controllerState.isActive && (
            <span className="bumper-tab-hint" aria-hidden="true">
              [LB]
            </span>
          )}
          <button
            type="button"
            data-testid="tab-game"
            onClick={() => handleSwitchTab('game')}
            className={`nav-tab-btn ${activeTab === 'game' ? 'active' : ''}`}
            aria-label="Play Game"
          >
            🏹 Play
          </button>
          <button
            type="button"
            data-testid="tab-world"
            onClick={() => handleSwitchTab('world')}
            className={`nav-tab-btn ${activeTab === 'world' ? 'active' : ''}`}
            aria-label="World Map"
          >
            🗺️ World Map
          </button>
          <button
            type="button"
            data-testid="tab-rewards"
            onClick={() => handleSwitchTab('rewards')}
            className={`nav-tab-btn ${activeTab === 'rewards' ? 'active' : ''}`}
            aria-label="Royal Armory"
          >
            🏆 Royal Armory
          </button>

          {/* Active indicator pill when viewing a secondary menu view */}
          {(activeTab === 'dashboard' || activeTab === 'history' || activeTab === 'curriculum') && (
            <span className="nav-tab-btn active secondary-active-pill" aria-current="page">
              {activeTab === 'dashboard' && '👨‍👩‍👧 Parent Dashboard'}
              {activeTab === 'history' && '📊 Progress & History'}
              {activeTab === 'curriculum' && '📋 Curriculum & Engine'}
            </span>
          )}

          {controllerState.isActive && (
            <span className="bumper-tab-hint" aria-hidden="true">
              [RB]
            </span>
          )}
        </nav>

        {/* Header Controls: Player profile, Controller badge, Audio toggle, and Menu Button */}
        <div className="app-header-controls">
          <div data-testid="current-player-badge" className="current-player-badge">
            <span data-testid="current-player-avatar" style={{ fontSize: 16 }}>
              {AVATAR_MAP[activeChild.avatar] || '🏹'}
            </span>
            <span className="current-player-name">
              <strong>{activeChild.name}</strong>
            </span>
            <button
              type="button"
              data-testid="switch-child-profile-btn"
              onClick={() => setShowChildPicker(true)}
              className="switch-child-profile-btn"
              aria-label="Switch child profile"
            >
              [Switch]
            </button>
          </div>

          {/* Xbox Controller Status Indicator */}
          {controllerState.isActive && (
            <div
              className="controller-status-badge"
              data-testid="controller-status-badge"
              title={
                controllerState.isConnected
                  ? `Xbox Controller Connected: ${controllerState.gamepadId}`
                  : 'Xbox Controller Navigation Ready'
              }
            >
              <span style={{ fontSize: 15 }}>🎮</span>
              <span className="controller-status-text">Ready</span>
              <span className="controller-bumper-hints">[LB/RB]</span>
            </div>
          )}

          {/* Audio Mute Toggle Button */}
          <button
            type="button"
            data-testid="audio-mute-toggle"
            className={`audio-toggle-btn ${isMuted ? 'muted' : 'unmuted'}`}
            onClick={handleToggleMute}
            aria-label={isMuted ? 'Unmute procedural audio' : 'Mute procedural audio'}
            title={isMuted ? 'Sound is muted (Click to unmute)' : 'Sound is active (Click to mute)'}
          >
            <span aria-hidden="true" style={{ fontSize: 15 }}>
              {isMuted ? '🔇' : '🔊'}
            </span>
            <span className="audio-toggle-label">{isMuted ? 'Muted' : 'Sound On'}</span>
          </button>

          {/* Menu Drawer Toggle Button */}
          <button
            type="button"
            data-testid="app-menu-toggle"
            className={`app-menu-toggle-btn ${isMenuOpen ? 'open' : ''}`}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Open game menu and settings"
            title="Menu & Settings (Press Start on Xbox Controller)"
          >
            <span className="menu-icon" aria-hidden="true">
              ☰
            </span>
            <span className="menu-label">Menu</span>
            {controllerState.isActive && (
              <span className="controller-menu-hint" aria-hidden="true">
                [Start]
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Menu Drawer Backdrop Overlay */}
      <div
        className={`app-menu-backdrop ${isMenuOpen ? 'open' : ''}`}
        onClick={() => setIsMenuOpen(false)}
        aria-hidden="true"
      />

      {/* Slide-out Menu Drawer for Settings, Parent Dashboard & Learning Engine */}
      <aside
        className={`app-menu-drawer ${isMenuOpen ? 'open' : ''}`}
        data-testid="app-menu-drawer"
        aria-label="Game Menu & Settings"
      >
        <div className="menu-drawer-header">
          <h2 className="menu-drawer-title">
            <span>⚙️</span> Game Menu & Settings
          </h2>
          <button
            type="button"
            data-testid="close-menu-btn"
            className="menu-close-btn"
            onClick={() => setIsMenuOpen(false)}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        {/* Archer Profile Card */}
        <div className="menu-drawer-profile-card">
          <div className="drawer-profile-info">
            <span className="drawer-profile-avatar">{AVATAR_MAP[activeChild.avatar] || '🏹'}</span>
            <div className="drawer-profile-text">
              <span className="drawer-profile-role">Active Archer</span>
              <strong className="drawer-profile-name">{activeChild.name}</strong>
            </div>
          </div>
          <button
            type="button"
            className="drawer-switch-profile-btn"
            data-testid="drawer-switch-profile-btn"
            onClick={() => {
              setIsMenuOpen(false);
              setShowChildPicker(true);
            }}
          >
            Switch Profile
          </button>
        </div>

        <nav className="menu-drawer-nav">
          <span className="menu-drawer-section-label">Management & Analytics</span>

          <button
            type="button"
            data-testid="tab-dashboard"
            onClick={() => {
              handleSwitchTab('dashboard');
              setIsMenuOpen(false);
            }}
            className={`menu-drawer-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          >
            <span className="menu-item-icon">👨‍👩‍👧</span>
            <div className="menu-item-content">
              <span className="menu-item-title">Parent Dashboard</span>
              <span className="menu-item-desc">PIN Protected • Daily Targets & Limits</span>
            </div>
          </button>

          <button
            type="button"
            data-testid="tab-history"
            onClick={() => {
              handleSwitchTab('history');
              setIsMenuOpen(false);
            }}
            className={`menu-drawer-item ${activeTab === 'history' ? 'active' : ''}`}
          >
            <span className="menu-item-icon">📊</span>
            <div className="menu-item-content">
              <span className="menu-item-title">Progress & History</span>
              <span className="menu-item-desc">Accuracy, Mastery Heatmaps & Streaks</span>
            </div>
          </button>

          <button
            type="button"
            data-testid="tab-curriculum"
            onClick={() => {
              handleSwitchTab('curriculum');
              setIsMenuOpen(false);
            }}
            className={`menu-drawer-item ${activeTab === 'curriculum' ? 'active' : ''}`}
          >
            <span className="menu-item-icon">📋</span>
            <div className="menu-item-content">
              <span className="menu-item-title">Curriculum & Engine</span>
              <span className="menu-item-desc">Skill Tree Levels & Pedagogical Rules</span>
            </div>
          </button>

          <span className="menu-drawer-section-label">Game Modes</span>

          <button
            type="button"
            data-testid="drawer-tab-game"
            onClick={() => {
              handleSwitchTab('game');
              setIsMenuOpen(false);
            }}
            className={`menu-drawer-item ${activeTab === 'game' ? 'active' : ''}`}
          >
            <span className="menu-item-icon">🏹</span>
            <div className="menu-item-content">
              <span className="menu-item-title">Archery Game Arena</span>
              <span className="menu-item-desc">Elemental bow shooting & math practice</span>
            </div>
          </button>

          <button
            type="button"
            data-testid="drawer-tab-world"
            onClick={() => {
              handleSwitchTab('world');
              setIsMenuOpen(false);
            }}
            className={`menu-drawer-item ${activeTab === 'world' ? 'active' : ''}`}
          >
            <span className="menu-item-icon">🗺️</span>
            <div className="menu-item-content">
              <span className="menu-item-title">World Progression Map</span>
              <span className="menu-item-desc">Explore kingdoms and biomes</span>
            </div>
          </button>

          <button
            type="button"
            data-testid="drawer-tab-rewards"
            onClick={() => {
              handleSwitchTab('rewards');
              setIsMenuOpen(false);
            }}
            className={`menu-drawer-item ${activeTab === 'rewards' ? 'active' : ''}`}
          >
            <span className="menu-item-icon">🏆</span>
            <div className="menu-item-content">
              <span className="menu-item-title">Royal Armory & Badges</span>
              <span className="menu-item-desc">Trophies, bows, and quiver cosmetics</span>
            </div>
          </button>
        </nav>

        <div className="menu-drawer-footer">
          <button type="button" className="drawer-audio-btn" onClick={handleToggleMute}>
            <span>{isMuted ? '🔇' : '🔊'}</span>
            <span>{isMuted ? 'Procedural Audio: Muted' : 'Procedural Audio: Active'}</span>
          </button>
          {controllerState.isActive && (
            <div className="drawer-controller-info">
              🎮 Xbox Controller Active • Press [B] to close
            </div>
          )}
        </div>
      </aside>

      {/* Screen Render: Primary Game Views (Play, World Map, Royal Armory) are single-screen 100vh; secondary views are scrollable */}
      {activeTab === 'game' ? (
        reasoningOpen && reasoningEnabled ? (
          <ReasoningTraining
            key={activeChild.id}
            playerId={activeChild.id}
            families={reasoningFamilies}
            api={apiClient}
            onBack={() => {
              setReasoningOpen(false);
              setReturnToTraining(true);
            }}
          />
        ) : (
          <GameScreen
            key={`${activeChild.id}_${syncTick}`}
            playerId={activeChild.id}
            mode={returnToTraining ? 'training' : 'adventure'}
            onReasoningTraining={reasoningEnabled ? () => setReasoningOpen(true) : undefined}
          />
        )
      ) : activeTab === 'world' ? (
        <WorldMap
          key={`${activeChild.id}_${syncTick}`}
          playerId={activeChild.id}
          apiClient={apiClient}
          onSelectArea={() => {
            setSyncTick((t) => t + 1);
            handleSwitchTab('game');
          }}
          onBackToGame={() => handleSwitchTab('game')}
        />
      ) : activeTab === 'rewards' ? (
        <RewardsScreen
          key={activeChild.id}
          playerId={activeChild.id}
          apiClient={apiClient}
          onRewardsChange={() => setSyncTick((t) => t + 1)}
          onBackToGame={() => handleSwitchTab('game')}
        />
      ) : (
        <div className="app-scrollable-content">
          {activeTab === 'dashboard' ? (
            !isParentUnlocked ? (
              <ParentGate onCancel={() => handleSwitchTab('game')} />
            ) : (
              <ParentDashboard
                key={`${activeChild.id}_${syncTick}`}
                playerId={activeChild.id}
                apiClient={apiClient}
              />
            )
          ) : activeTab === 'history' ? (
            <section data-testid="local-progress-view">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 16,
                }}
              >
                <h2 style={{ margin: 0, fontSize: 20 }}>📊 Local Practice Progress</h2>
                <button
                  type="button"
                  data-testid="clear-progress-button"
                  onClick={handleClearHistory}
                  style={{
                    background: '#fee2e2',
                    color: '#b91c1c',
                    border: '1px solid #fca5a5',
                    borderRadius: 6,
                    padding: '6px 12px',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  🗑️ Clear History
                </button>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: 12,
                  marginBottom: 24,
                }}
              >
                <div
                  style={{
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    padding: 16,
                  }}
                >
                  <div style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase' }}>
                    Total Attempts
                  </div>
                  <div
                    data-testid="total-attempts-metric"
                    style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}
                  >
                    {progress.stats.totalAttempts}
                  </div>
                </div>

                <div
                  style={{
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    padding: 16,
                  }}
                >
                  <div style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase' }}>
                    Overall Accuracy
                  </div>
                  <div
                    data-testid="accuracy-metric"
                    style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}
                  >
                    {Math.round(progress.stats.accuracy * 100)}%
                  </div>
                </div>

                <div
                  style={{
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    padding: 16,
                  }}
                >
                  <div style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase' }}>
                    Avg Speed
                  </div>
                  <div
                    data-testid="speed-metric"
                    style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}
                  >
                    {(progress.stats.averageResponseTimeMs / 1000).toFixed(1)}s
                  </div>
                </div>

                <div
                  style={{
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    padding: 16,
                  }}
                >
                  <div style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase' }}>
                    Recorded Sessions
                  </div>
                  <div
                    data-testid="total-sessions-metric"
                    style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}
                  >
                    {progress.sessions.length}
                  </div>
                </div>
              </div>

              <h3 style={{ fontSize: 16, marginBottom: 12 }}>📅 Daily Sessions</h3>
              {progress.sessions.length === 0 ? (
                <p style={{ color: '#6b7280', fontSize: 14 }}>No sessions completed yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
                  {progress.sessions.map((sess) => (
                    <div
                      key={sess.id}
                      data-testid={`session-item-${sess.id}`}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: '#f9fafb',
                        border: '1px solid #e5e7eb',
                        borderRadius: 6,
                        padding: '10px 14px',
                        fontSize: 14,
                      }}
                    >
                      <div>
                        <strong>{sess.date}</strong>
                        <span style={{ color: '#6b7280', marginLeft: 8 }}>
                          ({sess.arrowsUsed} / {sess.arrowsAllowed} arrows)
                        </span>
                      </div>
                      <div>
                        <span
                          style={{
                            background: sess.status === 'completed' ? '#dcfce7' : '#fef9c3',
                            color: sess.status === 'completed' ? '#166534' : '#854d0e',
                            padding: '2px 8px',
                            borderRadius: 9999,
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          {sess.status === 'completed' ? '🎯 Completed' : '🏹 In Progress'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <h3 style={{ fontSize: 16, marginBottom: 12 }}>🎯 Recent Question Attempts</h3>
              {progress.attempts.length === 0 ? (
                <p style={{ color: '#6b7280', fontSize: 14 }}>No attempts recorded yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {progress.attempts
                    .slice(-10)
                    .reverse()
                    .map((att, idx) => (
                      <div
                        key={idx}
                        data-testid={`attempt-item-${idx}`}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          background: att.correct ? '#f0fdf4' : '#fef2f2',
                          border: `1px solid ${att.correct ? '#bbf7d0' : '#fecaca'}`,
                          borderRadius: 6,
                          padding: '8px 12px',
                          fontSize: 14,
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: 600 }}>
                            {att.left} {att.operation === 'add' ? '+' : '-'} {att.right} ={' '}
                            {att.answer}
                          </span>
                          <span style={{ color: '#6b7280', fontSize: 12, marginLeft: 8 }}>
                            (chosen: {att.selectedAnswer})
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                          <span style={{ fontSize: 12, color: '#6b7280' }}>
                            {(att.responseTimeMs / 1000).toFixed(1)}s
                          </span>
                          <span>{att.correct ? '✅' : '❌'}</span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </section>
          ) : (
            <>
              <section
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: 20,
                  marginBottom: 20,
                }}
              >
                <h2 style={{ fontSize: 20, marginTop: 0, marginBottom: 8 }}>
                  Educational Engine Status
                </h2>
                <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>
                  <li>
                    <strong>Engine:</strong> {engineInfo.name} (v{engineInfo.version})
                  </li>
                  <li>
                    <strong>Status:</strong>{' '}
                    <span
                      style={{
                        display: 'inline-block',
                        background: '#dcfce7',
                        color: '#15803d',
                        padding: '2px 8px',
                        borderRadius: 9999,
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {engineInfo.status.toUpperCase()}
                    </span>
                  </li>
                </ul>
              </section>

              <section
                style={{
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: 8,
                  padding: 20,
                  marginBottom: 20,
                }}
              >
                <h2 style={{ fontSize: 18, marginTop: 0, color: '#1e40af' }}>
                  Learning Engine Integration Test
                </h2>
                <p style={{ margin: '8px 0' }}>
                  Evaluation test:{' '}
                  <code>
                    {sampleExpression.left} + {sampleExpression.right} = {result}
                  </code>
                </p>
                <p style={{ margin: '8px 0', fontSize: 14, color: '#4b5563' }}>
                  ✓ Workspace dependency successfully resolved from{' '}
                  <code>packages/learning-engine</code>.
                </p>
              </section>

              <section
                style={{
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  padding: 20,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                  }}
                >
                  <h2 style={{ fontSize: 20, marginTop: 0, marginBottom: 8 }}>
                    Curriculum Definition (Data-Driven)
                  </h2>
                  <span
                    style={{
                      fontSize: 12,
                      background: '#ecfdf5',
                      color: '#047857',
                      padding: '4px 10px',
                      borderRadius: 9999,
                      fontWeight: 600,
                    }}
                  >
                    {curriculumLevels.length} Initial Levels Defined
                  </span>
                </div>
                <p style={{ color: '#6b7280', fontSize: 14, margin: '0 0 16px' }}>
                  Curriculum levels and skill rules are loaded dynamically from data without
                  hardcoded UI logic.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {curriculumLevels.map((level) => {
                    const skills = getSkillsForLevel(level.id);
                    return (
                      <div
                        key={level.id}
                        style={{
                          border: '1px solid #f3f4f6',
                          borderRadius: 6,
                          padding: 14,
                          background: '#fafafa',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            marginBottom: 6,
                          }}
                        >
                          <span
                            style={{
                              background: '#3b82f6',
                              color: '#ffffff',
                              fontSize: 12,
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 4,
                            }}
                          >
                            Level {level.levelNumber}
                          </span>
                          <strong style={{ fontSize: 16 }}>{level.name}</strong>
                        </div>
                        <p style={{ margin: '4px 0 8px', fontSize: 14, color: '#4b5563' }}>
                          <strong>Goal:</strong> {level.goal}
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                          {skills.map((skill) => (
                            <code
                              key={skill.id}
                              style={{
                                background: '#e0e7ff',
                                color: '#3730a3',
                                padding: '2px 6px',
                                borderRadius: 4,
                                fontSize: 12,
                              }}
                              title={skill.description}
                            >
                              {skill.name} ({skill.id})
                            </code>
                          ))}
                        </div>
                        <div style={{ fontSize: 13, color: '#6b7280' }}>
                          <span>Examples: </span>
                          {level.examples.map((ex, i) => (
                            <span
                              key={i}
                              style={{
                                display: 'inline-block',
                                background: '#f3f4f6',
                                border: '1px solid #e5e7eb',
                                borderRadius: 3,
                                padding: '1px 6px',
                                marginRight: 6,
                                fontFamily: 'monospace',
                                color: '#111827',
                              }}
                            >
                              {ex}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </>
          )}
        </div>
      )}

      {/* Child Profile Picker Modal */}
      {showChildPicker && (
        <ChildProfilePicker
          onClose={() => setShowChildPicker(false)}
          onSelect={() => setShowChildPicker(false)}
        />
      )}
    </main>
  );
};

export interface AppProps {
  apiClient?: MathArcherApiClient;
}

export const App: React.FC<AppProps> = ({ apiClient }) => {
  return (
    <AuthProvider apiClient={apiClient}>
      <AppContent />
    </AuthProvider>
  );
};
