import React, { useState } from 'react';
import {
  getEngineInfo,
  solveExpression,
  getAllCurriculumLevels,
  getSkillsForLevel,
  type Skill,
  loadLocalProgress,
  clearLocalProgress,
  type LocalProgress,
} from '@math-archer/learning-engine';
import { GameScreen } from './components/GameScreen';
import { ParentDashboard } from './components/ParentDashboard';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'game' | 'dashboard' | 'history' | 'curriculum'>('game');
  const [progress, setProgress] = useState<LocalProgress>(() => loadLocalProgress());
  const engineInfo = getEngineInfo();
  const curriculumLevels = getAllCurriculumLevels();
  const [sampleExpression] = useState({ left: 8, right: 7, op: 'add' as const });
  const activeSkill: Skill = 'cross_10_addition';

  const handleSwitchTab = (tab: 'game' | 'dashboard' | 'history' | 'curriculum') => {
    if (tab === 'history' || tab === 'dashboard') {
      setProgress(loadLocalProgress());
    }
    setActiveTab(tab);
  };

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
    <main
      style={{
        fontFamily: 'system-ui, -apple-system, sans-serif',
        maxWidth: 800,
        margin: '40px auto',
        padding: '0 20px',
        color: '#1f2937',
      }}
    >
      <header style={{ borderBottom: '2px solid #e5e7eb', paddingBottom: 16, marginBottom: 24 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: 30, display: 'flex', alignItems: 'center', gap: 10 }}>
              🏹 Math Archer
            </h1>
            <p style={{ margin: '6px 0 0', color: '#6b7280', fontSize: 14 }}>
              Adaptive Archery Math Practice for Children
            </p>
          </div>
          <nav style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              data-testid="tab-game"
              onClick={() => handleSwitchTab('game')}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: activeTab === 'game' ? '2px solid #2563eb' : '2px solid #e5e7eb',
                background: activeTab === 'game' ? '#eff6ff' : '#ffffff',
                color: activeTab === 'game' ? '#1e40af' : '#4b5563',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              🏹 Game Screen
            </button>
            <button
              type="button"
              data-testid="tab-dashboard"
              onClick={() => handleSwitchTab('dashboard')}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: activeTab === 'dashboard' ? '2px solid #2563eb' : '2px solid #e5e7eb',
                background: activeTab === 'dashboard' ? '#eff6ff' : '#ffffff',
                color: activeTab === 'dashboard' ? '#1e40af' : '#4b5563',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              👨‍👩‍👧 Parent Dashboard
            </button>
            <button
              type="button"
              data-testid="tab-history"
              onClick={() => handleSwitchTab('history')}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: activeTab === 'history' ? '2px solid #2563eb' : '2px solid #e5e7eb',
                background: activeTab === 'history' ? '#eff6ff' : '#ffffff',
                color: activeTab === 'history' ? '#1e40af' : '#4b5563',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              📊 Progress & History
            </button>
            <button
              type="button"
              data-testid="tab-curriculum"
              onClick={() => handleSwitchTab('curriculum')}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: activeTab === 'curriculum' ? '2px solid #2563eb' : '2px solid #e5e7eb',
                background: activeTab === 'curriculum' ? '#eff6ff' : '#ffffff',
                color: activeTab === 'curriculum' ? '#1e40af' : '#4b5563',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              📋 Curriculum & Engine
            </button>
          </nav>
        </div>
      </header>

      {activeTab === 'game' ? (
        <GameScreen />
      ) : activeTab === 'dashboard' ? (
        <ParentDashboard />
      ) : activeTab === 'history' ? (
        <section data-testid="local-progress-view">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: 22 }}>📁 Local Progress & Attempt History</h2>
              <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>
                Stored locally: sessions, attempts, and skill progress (Task 5.1).
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                data-testid="refresh-progress-button"
                onClick={() => setProgress(loadLocalProgress())}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: '1px solid #d1d5db',
                  background: '#f9fafb',
                  fontSize: 13,
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                🔄 Refresh
              </button>
              <button
                type="button"
                data-testid="clear-progress-button"
                onClick={handleClearHistory}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: '1px solid #fca5a5',
                  background: '#fef2f2',
                  color: '#b91c1c',
                  fontSize: 13,
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                🗑️ Clear History
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div
            data-testid="progress-metrics-bar"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: 12,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                padding: 12,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase' }}>
                Total Attempts
              </div>
              <div
                data-testid="total-attempts-metric"
                style={{ fontSize: 24, fontWeight: 700, color: '#111827' }}
              >
                {progress.stats.totalAttempts}
              </div>
            </div>
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                padding: 12,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase' }}>
                Accuracy
              </div>
              <div
                data-testid="accuracy-metric"
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: progress.stats.accuracy >= 0.8 ? '#059669' : '#d97706',
                }}
              >
                {Math.round(progress.stats.accuracy * 100)}%
              </div>
            </div>
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                padding: 12,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase' }}>
                Sessions
              </div>
              <div
                data-testid="total-sessions-metric"
                style={{ fontSize: 24, fontWeight: 700, color: '#2563eb' }}
              >
                {progress.sessions.length}
              </div>
            </div>
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                padding: 12,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase' }}>
                Avg Speed
              </div>
              <div
                data-testid="avg-speed-metric"
                style={{ fontSize: 24, fontWeight: 700, color: '#4b5563' }}
              >
                {progress.stats.averageResponseTimeMs > 0
                  ? `${(progress.stats.averageResponseTimeMs / 1000).toFixed(1)}s`
                  : '—'}
              </div>
            </div>
          </div>

          {/* Stored Sessions */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              padding: 16,
              marginBottom: 20,
            }}
          >
            <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>
              📅 Daily Sessions ({progress.sessions.length})
            </h3>
            {progress.sessions.length === 0 ? (
              <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>
                No daily sessions recorded yet. Start practicing in Game Screen!
              </p>
            ) : (
              <div
                data-testid="sessions-history-list"
                style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
              >
                {progress.sessions.map((s) => (
                  <div
                    key={s.id}
                    data-testid={`session-item-${s.id}`}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      background: '#f9fafb',
                      borderRadius: 6,
                      fontSize: 14,
                    }}
                  >
                    <div>
                      <strong>{s.date}</strong>
                      <span style={{ marginLeft: 8, color: '#6b7280', fontSize: 13 }}>
                        {s.status === 'completed' ? '🏁 Completed' : '🏹 In Progress'}
                      </span>
                    </div>
                    <div style={{ color: '#374151' }}>
                      Arrows: <strong>{s.arrowsUsed}</strong> / {s.arrowsAllowed} | Hits:{' '}
                      <strong style={{ color: '#059669' }}>{s.hits}</strong>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stored Attempts */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              padding: 16,
            }}
          >
            <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>
              🎯 Recent Attempt Log ({progress.attempts.length} total)
            </h3>
            {progress.attempts.length === 0 ? (
              <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>
                No attempts recorded yet. Practice questions to record attempts!
              </p>
            ) : (
              <div
                data-testid="attempt-history-list"
                style={{ maxHeight: 360, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}
              >
                {[...progress.attempts].reverse().slice(0, 50).map((att, idx) => (
                  <div
                    key={`${att.questionId}-${att.timestamp}-${idx}`}
                    data-testid={`attempt-item-${idx}`}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      background: att.correct ? '#f0fdf4' : '#fef2f2',
                      borderLeft: `4px solid ${att.correct ? '#16a34a' : '#dc2626'}`,
                      borderRadius: 4,
                      fontSize: 13,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span>{att.correct ? '🎯' : '🏹 Miss'}</span>
                      <strong style={{ fontFamily: 'monospace', fontSize: 14 }}>
                        {att.left} {att.operation === 'add' ? '+' : '-'} {att.right} = {att.selectedAnswer}
                      </strong>
                      {!att.correct && (
                        <span style={{ color: '#6b7280' }}>(ans: {att.answer})</span>
                      )}
                      <span
                        style={{
                          background: '#e0e7ff',
                          color: '#3730a3',
                          padding: '1px 6px',
                          borderRadius: 3,
                          fontSize: 11,
                        }}
                      >
                        {att.skill}
                      </span>
                      {att.hintUsed && (
                        <span style={{ fontSize: 11, color: '#d97706' }}>💡 hint</span>
                      )}
                    </div>
                    <div style={{ color: '#6b7280', fontSize: 12 }}>
                      {att.responseTimeMs ? `${(att.responseTimeMs / 1000).toFixed(1)}s` : ''} |{' '}
                      {att.mode ?? 'adventure'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      ) : (
        <>
          <section
            style={{
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              padding: 20,
              marginBottom: 20,
            }}
          >
            <h2 style={{ fontSize: 18, marginTop: 0 }}>System Status</h2>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, lineHeight: 1.8 }}>
              <li>
                <strong>Learning Engine Package:</strong> {engineInfo.name} (v{engineInfo.version})
              </li>
              <li>
                <strong>Engine Status:</strong>{' '}
                <span style={{ color: '#059669', fontWeight: 600 }}>{engineInfo.status}</span>
              </li>
              <li>
                <strong>Initial Skill Target:</strong> <code>{activeSkill}</code>
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
    </main>
  );
};
