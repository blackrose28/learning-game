import React, { useState, useEffect } from 'react';
import {
  getEngineInfo,
  solveExpression,
  getAllCurriculumLevels,
  getSkillsForLevel,
  loadLocalProgress,
  clearLocalProgress,
  type LocalProgress,
} from '@math-archer/learning-engine';
import { GameScreen } from './components/GameScreen';
import { ParentDashboard } from './components/ParentDashboard';
import { ParentGate } from './components/ParentGate';
import { ChildProfilePicker } from './components/ChildProfilePicker';
import { InstallPrompt } from './components/InstallPrompt';
import { WorldMap } from './components/WorldMap';
import { RewardsScreen } from './components/RewardsScreen';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useGamepad, XboxButton } from './input/useGamepad';
import { hydratePlayerProgress } from './sync';
import './App.css';

const APP_TABS = ['game', 'world', 'rewards', 'dashboard', 'history', 'curriculum'] as const;

export const AppContent: React.FC = () => {
  const { activeChild, isParentUnlocked, apiClient } = useAuth();
  const [activeTab, setActiveTab] = useState<
    'game' | 'world' | 'rewards' | 'dashboard' | 'history' | 'curriculum'
  >('game');
  const [progress, setProgress] = useState<LocalProgress>(() => loadLocalProgress());
  const [syncTick, setSyncTick] = useState<number>(0);
  const [showChildPicker, setShowChildPicker] = useState<boolean>(false);
  const engineInfo = getEngineInfo();
  const curriculumLevels = getAllCurriculumLevels();
  const [sampleExpression] = useState({ left: 8, right: 7, op: 'add' as const });

  // Startup and profile switch cloud hydration
  useEffect(() => {
    let isMounted = true;
    hydratePlayerProgress(activeChild.id, apiClient).then(() => {
      if (isMounted) {
        setProgress(loadLocalProgress(activeChild.id));
        setSyncTick((t) => t + 1);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [activeChild.id, apiClient]);

  const handleSwitchTab = (
    tab: 'game' | 'world' | 'rewards' | 'dashboard' | 'history' | 'curriculum'
  ) => {
    if (tab === 'history' || tab === 'dashboard') {
      setProgress(loadLocalProgress(activeChild.id));
    }
    setActiveTab(tab);
  };

  const controllerState = useGamepad({
    enabled: true,
    onButtonDown: (btn) => {
      if (btn === XboxButton.LB) {
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
        setActiveTab((curr) => {
          const idx = APP_TABS.indexOf(curr);
          const nextIdx = (idx + 1) % APP_TABS.length;
          const nextTab = APP_TABS[nextIdx];
          if (nextTab === 'history' || nextTab === 'dashboard') {
            setProgress(loadLocalProgress(activeChild.id));
          }
          return nextTab;
        });
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
      <header className="app-header">
        <div className="app-header-top">
          <div>
            <h1 className="app-title">🏹 Math Archer</h1>
            <p className="app-subtitle">Adaptive Archery Math Practice for Children</p>
          </div>

          {/* Active Player Profile Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              data-testid="current-player-badge"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 20,
                padding: '6px 14px',
              }}
            >
              <span style={{ fontSize: 16 }}>🏹</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#166534' }}>
                Playing as: <strong>{activeChild.name}</strong>
              </span>
              <button
                type="button"
                data-testid="switch-child-profile-btn"
                onClick={() => setShowChildPicker(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#15803d',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                  padding: 0,
                  marginLeft: 4,
                }}
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
                <span style={{ fontSize: 16 }}>🎮</span>
                <span style={{ fontSize: 13, fontWeight: 700 }}>Controller Ready</span>
                <span className="controller-bumper-hints">[LB / RB Tabs]</span>
              </div>
            )}
          </div>
        </div>

        {/* Main Tab Navigation */}
        <nav className="app-nav">
          <button
            type="button"
            data-testid="tab-game"
            onClick={() => handleSwitchTab('game')}
            className={`nav-tab-btn ${activeTab === 'game' ? 'active' : ''}`}
          >
            🏹 Game Screen
          </button>
          <button
            type="button"
            data-testid="tab-world"
            onClick={() => handleSwitchTab('world')}
            className={`nav-tab-btn ${activeTab === 'world' ? 'active' : ''}`}
          >
            🗺️ World Map
          </button>
          <button
            type="button"
            data-testid="tab-rewards"
            onClick={() => handleSwitchTab('rewards')}
            className={`nav-tab-btn ${activeTab === 'rewards' ? 'active' : ''}`}
          >
            🏆 Royal Armory
          </button>
          <button
            type="button"
            data-testid="tab-dashboard"
            onClick={() => handleSwitchTab('dashboard')}
            className={`nav-tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          >
            👨‍👩‍👧 Parent Dashboard
          </button>
          <button
            type="button"
            data-testid="tab-history"
            onClick={() => handleSwitchTab('history')}
            className={`nav-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          >
            📊 Progress & History
          </button>
          <button
            type="button"
            data-testid="tab-curriculum"
            onClick={() => handleSwitchTab('curriculum')}
            className={`nav-tab-btn ${activeTab === 'curriculum' ? 'active' : ''}`}
          >
            📋 Curriculum & Engine
          </button>
        </nav>
      </header>

      {/* Screen Render */}
      {activeTab === 'game' ? (
        <GameScreen key={`${activeChild.id}_${syncTick}`} playerId={activeChild.id} />
      ) : activeTab === 'world' ? (
        <WorldMap
          key={`${activeChild.id}_${syncTick}`}
          playerId={activeChild.id}
          onSelectArea={() => handleSwitchTab('game')}
          onBackToGame={() => handleSwitchTab('game')}
        />
      ) : activeTab === 'rewards' ? (
        <RewardsScreen
          key={`${activeChild.id}_${syncTick}`}
          playerId={activeChild.id}
          onBackToGame={() => handleSwitchTab('game')}
        />
      ) : activeTab === 'dashboard' ? (
        !isParentUnlocked ? (
          <ParentGate onCancel={() => handleSwitchTab('game')} />
        ) : (
          <ParentDashboard key={`${activeChild.id}_${syncTick}`} playerId={activeChild.id} />
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
                        {att.left} {att.operation === 'add' ? '+' : '-'} {att.right} = {att.answer}
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
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}
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
              Curriculum levels and skill rules are loaded dynamically from data without hardcoded
              UI logic.
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

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};
