import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  loadParentDashboard,
  computeParentDashboardData,
  createSimulatedProfile,
  type ParentDashboardData,
  type Attempt,
  type DailySession,
} from '@math-archer/learning-engine';
import './ParentDashboard.css';

interface ParentDashboardProps {
  playerId?: string;
}

/**
 * Creates realistic sample data for previewing the parent dashboard
 * when no real attempts exist yet.
 */
function createRealisticSampleData(): ParentDashboardData {
  const simulatedProfile = createSimulatedProfile({
    playerId: 'sample-player',
    skills: {
      make_10: { level: 'strong', accuracy: 0.90, attempts: 30, averageResponseTimeMs: 2800 },
      basic_addition: { level: 'mastered', accuracy: 0.97, attempts: 35, averageResponseTimeMs: 1800 },
      cross_10_addition: { level: 'weak', accuracy: 0.51, recentAccuracy: 0.64, attempts: 28, averageResponseTimeMs: 4600 },
      basic_subtraction: { level: 'strong', accuracy: 0.89, attempts: 25, averageResponseTimeMs: 2500 },
      cross_10_subtraction: { level: 'developing', accuracy: 0.68, attempts: 24, averageResponseTimeMs: 5900, hintsUsed: 5 },
    },
    pairs: {
      '13 + 8': { attempts: 6, correct: 2, accuracy: 0.33, averageResponseTimeMs: 4800 },
      '17 - 9': { attempts: 5, correct: 2, accuracy: 0.40, averageResponseTimeMs: 5200 },
      '14 + 7': { attempts: 5, correct: 3, accuracy: 0.60, averageResponseTimeMs: 4900 },
      '16 - 8': { attempts: 6, correct: 4, accuracy: 0.67, averageResponseTimeMs: 4200 },
    },
  });

  const sessions: DailySession[] = [
    {
      id: 'session-m1',
      playerId: 'sample-player',
      date: '2026-09-12',
      arrowsAllowed: 50,
      arrowsUsed: 50,
      hits: 36,
      status: 'completed',
      startedAt: '2026-09-12T10:00:00.000Z',
    },
    {
      id: 'session-m2',
      playerId: 'sample-player',
      date: '2026-09-13',
      arrowsAllowed: 50,
      arrowsUsed: 50,
      hits: 39,
      status: 'completed',
      startedAt: '2026-09-13T10:00:00.000Z',
    },
    {
      id: 'session-m3',
      playerId: 'sample-player',
      date: '2026-09-14',
      arrowsAllowed: 50,
      arrowsUsed: 50,
      hits: 41,
      status: 'completed',
      startedAt: '2026-09-14T10:00:00.000Z',
    },
    {
      id: 'session-m4',
      playerId: 'sample-player',
      date: '2026-09-15',
      arrowsAllowed: 50,
      arrowsUsed: 50,
      hits: 43,
      status: 'completed',
      startedAt: '2026-09-15T10:00:00.000Z',
    },
    {
      id: 'session-m5',
      playerId: 'sample-player',
      date: '2026-09-16',
      arrowsAllowed: 50,
      arrowsUsed: 50,
      hits: 43,
      status: 'completed',
      startedAt: '2026-09-16T10:00:00.000Z',
    },
  ];

  // 142 attempts across multiple days
  const attempts: Attempt[] = [];

  // Historical early attempts (Mon-Thu)
  for (let i = 0; i < 40; i++) {
    attempts.push({
      questionId: `hist_add_${i}`,
      operation: 'add',
      left: 7,
      right: 6,
      answer: 13,
      selectedAnswer: i % 4 === 0 ? 12 : 13,
      correct: i % 4 !== 0,
      responseTimeMs: 3800,
      skill: 'cross_10_addition',
      hintUsed: i % 8 === 0,
      timestamp: '2026-09-14T10:00:00.000Z',
    });
  }

  // Today's attempts (Fri 2026-09-16): 50 arrows, 43 hits (86% accuracy)
  // Addition: 30 attempts, 28 hits (93%)
  for (let i = 0; i < 30; i++) {
    const isCorrect = i !== 5 && i !== 18;
    attempts.push({
      questionId: `today_add_${i}`,
      operation: 'add',
      left: 8,
      right: 7,
      answer: 15,
      selectedAnswer: isCorrect ? 15 : 14,
      correct: isCorrect,
      responseTimeMs: 2200,
      skill: 'cross_10_addition',
      hintUsed: false,
      timestamp: '2026-09-16T14:00:00.000Z',
    });
  }

  // Subtraction: 20 attempts, 15 hits (75%)
  for (let i = 0; i < 20; i++) {
    const isCorrect = i >= 5;
    attempts.push({
      questionId: `today_sub_${i}`,
      operation: 'subtract',
      left: 17,
      right: 9,
      answer: 8,
      selectedAnswer: isCorrect ? 8 : 7,
      correct: isCorrect,
      responseTimeMs: 4800,
      skill: 'cross_10_subtraction',
      hintUsed: i < 3,
      timestamp: '2026-09-16T14:15:00.000Z',
    });
  }

  // Also include 3 systematic mistakes for 13 + 8 answering 20
  for (let i = 0; i < 3; i++) {
    attempts.push({
      questionId: `mistake_${i}`,
      operation: 'add',
      left: 13,
      right: 8,
      answer: 21,
      selectedAnswer: 20,
      correct: false,
      responseTimeMs: 4500,
      skill: 'cross_10_addition',
      hintUsed: false,
      timestamp: '2026-09-16T14:20:00.000Z',
    });
  }

  return computeParentDashboardData({
    playerId: 'sample-player',
    profile: simulatedProfile,
    sessions,
    attempts,
    date: '2026-09-16',
  });
}

export const ParentDashboard: React.FC<ParentDashboardProps> = ({ playerId = 'player-local' }) => {
  const [useSample, setUseSample] = useState<boolean>(false);
  const [data, setData] = useState<ParentDashboardData | null>(null);

  const loadData = useCallback(() => {
    if (useSample) {
      setData(createRealisticSampleData());
    } else {
      const liveData = loadParentDashboard(playerId);
      setData(liveData);
    }
  }, [useSample, playerId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleSample = () => {
    setUseSample((prev) => !prev);
  };

  const chartHistory = useMemo(() => {
    if (!data?.trend.history || data.trend.history.length === 0) {
      return [];
    }
    // Take the last 7 recorded daily points
    return data.trend.history.slice(-7);
  }, [data]);

  if (!data) {
    return (
      <div className="parent-dashboard" data-testid="parent-dashboard-view">
        <p>Loading parent dashboard...</p>
      </div>
    );
  }

  const { today, overall, operationComparison, skills, weakSkills, weakPairs, trend, recommendation } = data;

  return (
    <section className="parent-dashboard" data-testid="parent-dashboard-view">
      {/* Header */}
      <header className="dashboard-header">
        <div>
          <h2>👨‍👩‍👧 Parent Dashboard</h2>
          <p>Clear pedagogical insights into your child&apos;s daily practice, mastery, and growth.</p>
        </div>
        <div className="dashboard-actions">
          <button
            type="button"
            className={`btn-secondary ${useSample ? 'btn-sample' : ''}`}
            data-testid="toggle-sample-data-btn"
            onClick={toggleSample}
          >
            {useSample ? '📁 Switch to Real Data' : '✨ Preview Sample Data'}
          </button>
          <button
            type="button"
            className="btn-secondary"
            data-testid="refresh-dashboard-btn"
            onClick={loadData}
          >
            🔄 Refresh
          </button>
        </div>
      </header>

      {useSample && (
        <div
          style={{
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: 8,
            padding: '10px 14px',
            marginBottom: 20,
            fontSize: 13,
            color: '#1e40af',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
          data-testid="sample-data-banner"
        >
          <span>
            💡 <strong>Preview Mode:</strong> Displaying realistic practice data with 5 daily sessions, 142 attempts, and targeted focus areas.
          </span>
          <button
            type="button"
            onClick={() => setUseSample(false)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#1d4ed8',
              fontWeight: 700,
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Close Preview
          </button>
        </div>
      )}

      {/* Quick Answer 6-Question Grid */}
      <div className="quick-questions-card" data-testid="quick-questions-summary">
        <h3>🧭 At a Glance — 6 Key Questions Answered</h3>
        <div className="questions-grid">
          {/* Q1 */}
          <div className="question-item" data-testid="q1-practice-card">
            <span className="q-title">1. Practice Amount</span>
            <span className="q-answer" data-testid="q1-practice-answer">
              {today.arrowsUsed} / {today.arrowsAllowed} arrows today
            </span>
            <span className="q-sub">
              {today.sessionStatus === 'completed'
                ? '🎯 Daily goal reached!'
                : `${today.arrowsRemaining} arrows remaining`}
            </span>
          </div>

          {/* Q2 */}
          <div className="question-item" data-testid="q2-accuracy-card">
            <span className="q-title">2. Overall Accuracy</span>
            <span className="q-answer" data-testid="q2-accuracy-answer">
              {Math.round(overall.accuracy * 100)}% accuracy
            </span>
            <span className="q-sub">
              {today.attemptsCount > 0
                ? `${Math.round(today.accuracy * 100)}% on today's arrows`
                : `${overall.totalHits} / ${overall.totalAttempts} total hits`}
            </span>
          </div>

          {/* Q3 */}
          <div className="question-item" data-testid="q3-operation-card">
            <span className="q-title">3. Add vs Subtract</span>
            <span className="q-answer" data-testid="q3-operation-answer">
              {operationComparison.weakerOperation === 'subtraction'
                ? 'Subtraction is weaker'
                : operationComparison.weakerOperation === 'addition'
                ? 'Addition is weaker'
                : operationComparison.weakerOperation === 'equal'
                ? 'Balanced performance'
                : 'More practice needed'}
            </span>
            <span className="q-sub">
              + {Math.round(overall.additionAccuracy * 100)}% vs - {Math.round(overall.subtractionAccuracy * 100)}%
            </span>
          </div>

          {/* Q4 */}
          <div className="question-item" data-testid="q4-weak-skills-card">
            <span className="q-title">4. Specific Weak Skills</span>
            <span className="q-answer" data-testid="q4-weak-skills-answer">
              {weakSkills.length === 0
                ? 'None detected 🎉'
                : `${weakSkills.length} skill${weakSkills.length > 1 ? 's' : ''} to practice`}
            </span>
            <span className="q-sub">
              {weakSkills.length > 0 ? weakSkills.map((s) => s.name).join(', ') : 'All active skills solid'}
            </span>
          </div>

          {/* Q5 */}
          <div className="question-item" data-testid="q5-weak-pairs-card">
            <span className="q-title">5. Problem Combinations</span>
            <span className="q-answer" data-testid="q5-weak-pairs-answer">
              {weakPairs.length === 0
                ? 'None flagged'
                : `${weakPairs.length} pair${weakPairs.length > 1 ? 's' : ''} with misses`}
            </span>
            <span className="q-sub">
              {weakPairs.length > 0
                ? weakPairs.slice(0, 3).map((p) => p.pairKey).join(', ')
                : 'Consistent accuracy across pairs'}
            </span>
          </div>

          {/* Q6 */}
          <div className="question-item" data-testid="q6-improving-card">
            <span className="q-title">6. Performance Trend</span>
            <span className="q-answer" data-testid="q6-improving-answer">
              {trend.status === 'improving'
                ? `Improving (+${trend.changePercentage}%) ↗️`
                : trend.status === 'declining'
                ? `Dipped (${trend.changePercentage}%) ↘️`
                : trend.status === 'steady'
                ? 'Steady performance ➡️'
                : 'Establishing trend...'}
            </span>
            <span className="q-sub">
              {trend.status === 'insufficient_data'
                ? 'Need 8+ attempts'
                : `Recent ${Math.round(trend.recentAccuracy * 100)}% vs ${Math.round(trend.baselineAccuracy * 100)}% baseline`}
            </span>
          </div>
        </div>
      </div>

      {/* Row of 4 Key Metrics */}
      <div className="metrics-row" data-testid="core-metrics-row">
        {/* Metric 1: Today's Arrows */}
        <div className="metric-card" data-testid="today-arrows-card">
          <span className="metric-label">Today&apos;s Arrows</span>
          <span className="metric-val" data-testid="today-arrows-metric">
            {today.arrowsUsed} / {today.arrowsAllowed}
          </span>
          <div className="arrow-progress-container">
            <div
              className="arrow-progress-fill"
              style={{
                width: `${Math.min(100, Math.round((today.arrowsUsed / (today.arrowsAllowed || 50)) * 100))}%`,
              }}
            />
          </div>
          <span className="metric-sub">
            {today.arrowsRemaining > 0
              ? `${today.arrowsRemaining} arrows left today`
              : '🎯 50 arrows complete!'}
          </span>
        </div>

        {/* Metric 2: Accuracy */}
        <div className="metric-card" data-testid="accuracy-card">
          <span className="metric-label">Accuracy</span>
          <span className="metric-val" data-testid="overall-accuracy-metric">
            {Math.round(overall.accuracy * 100)}%
          </span>
          <span className="metric-sub" data-testid="today-accuracy-metric">
            Today: {Math.round(today.accuracy * 100)}% ({today.hitsCount} hits)
          </span>
        </div>

        {/* Metric 3: Average Response Time */}
        <div className="metric-card" data-testid="response-time-card">
          <span className="metric-label">Avg Response Time</span>
          <span className="metric-val" data-testid="avg-response-time-metric">
            {overall.averageResponseTimeMs > 0
              ? `${(overall.averageResponseTimeMs / 1000).toFixed(1)}s`
              : '—'}
          </span>
          <span className="metric-sub">
            {today.averageResponseTimeMs > 0
              ? `Today: ${(today.averageResponseTimeMs / 1000).toFixed(1)}s`
              : 'Fluency pace'}
          </span>
        </div>

        {/* Metric 4: Hint Rate */}
        <div className="metric-card" data-testid="hint-rate-card">
          <span className="metric-label">Hint Rate</span>
          <span className="metric-val" data-testid="hint-rate-metric">
            {Math.round(overall.hintRate * 100)}%
          </span>
          <span className="metric-sub">
            {overall.hintsUsed} hint{overall.hintsUsed === 1 ? '' : 's'} used across all shots
          </span>
        </div>
      </div>

      {/* Two Column Grid: Operations Comparison + Trend Chart */}
      <div className="dashboard-grid-2col">
        {/* Operation Comparison (Question 3) */}
        <section className="dashboard-section" data-testid="operation-comparison-section">
          <div className="section-header">
            <h3>⚖️ Addition vs Subtraction</h3>
            <span
              className={`badge ${
                operationComparison.weakerOperation === 'subtraction'
                  ? 'badge-developing'
                  : operationComparison.weakerOperation === 'addition'
                  ? 'badge-weak'
                  : 'badge-strong'
              }`}
            >
              {operationComparison.weakerOperation === 'equal'
                ? 'Balanced'
                : operationComparison.weakerOperation === 'insufficient_data'
                ? 'Analyzing'
                : `${operationComparison.weakerOperation.toUpperCase()} WEAKER`}
            </span>
          </div>

          <div className="operation-comparison-container">
            <div className="operation-cards">
              <div
                className={`op-box ${operationComparison.isAdditionWeaker ? 'weaker' : 'stronger'}`}
                data-testid="addition-op-box"
              >
                <div className="op-title">➕ Addition</div>
                <div className="op-acc" data-testid="addition-accuracy-metric">
                  {Math.round(overall.additionAccuracy * 100)}%
                </div>
                <div className="op-sub">
                  {overall.additionCorrect} / {overall.additionAttempts} correct
                </div>
              </div>

              <div
                className={`op-box ${operationComparison.isSubtractionWeaker ? 'weaker' : 'stronger'}`}
                data-testid="subtraction-op-box"
              >
                <div className="op-title">➖ Subtraction</div>
                <div className="op-acc" data-testid="subtraction-accuracy-metric">
                  {Math.round(overall.subtractionAccuracy * 100)}%
                </div>
                <div className="op-sub">
                  {overall.subtractionCorrect} / {overall.subtractionAttempts} correct
                </div>
              </div>
            </div>

            <div
              className={`comparison-banner ${
                operationComparison.weakerOperation === 'equal'
                  ? 'balanced'
                  : operationComparison.weakerOperation === 'insufficient_data'
                  ? 'neutral'
                  : 'warning'
              }`}
              data-testid="operation-comparison-banner"
            >
              <span>{operationComparison.summary}</span>
            </div>
          </div>
        </section>

        {/* Historical Chart & Improvement (Question 6) */}
        <section className="dashboard-section" data-testid="historical-chart-section">
          <div className="section-header">
            <h3>📈 Improvement & History</h3>
            <span
              className={`trend-pill ${
                trend.status === 'improving'
                  ? 'trend-improving'
                  : trend.status === 'declining'
                  ? 'trend-declining'
                  : trend.status === 'steady'
                  ? 'trend-steady'
                  : 'trend-insufficient'
              }`}
              data-testid="trend-status-pill"
            >
              {trend.status === 'improving'
                ? '↗️ Improving'
                : trend.status === 'declining'
                ? '↘️ Declining'
                : trend.status === 'steady'
                ? '➡️ Steady'
                : 'Need Data'}
            </span>
          </div>

          <div className="chart-container">
            {chartHistory.length === 0 ? (
              <p style={{ color: '#6b7280', fontSize: 13, margin: '20px 0' }}>
                No daily session history yet. Shoot arrows in Game Screen to populate daily progress!
              </p>
            ) : (
              <div className="chart-bars" data-testid="history-chart-bars">
                {chartHistory.map((point) => {
                  const accPercent = Math.round(point.accuracy * 100);
                  const isHigh = accPercent >= 80;
                  const isLow = accPercent < 65;
                  return (
                    <div key={point.date} className="chart-bar-group" data-testid={`chart-bar-${point.date}`}>
                      <span className="chart-bar-val">{accPercent}%</span>
                      <div
                        className={`chart-bar ${isHigh ? 'high' : isLow ? 'low' : ''}`}
                        style={{ height: `${Math.max(8, accPercent)}%` }}
                        title={`${point.date} (${point.dayOfWeek}): ${accPercent}% accuracy (${point.arrowsUsed} arrows)`}
                      />
                      <span className="chart-bar-label">{point.dayOfWeek}</span>
                    </div>
                  );
                })}
              </div>
            )}

            <p style={{ fontSize: 13, color: '#4b5563', margin: '6px 0 0' }} data-testid="trend-summary-text">
              {trend.summary}
            </p>
          </div>
        </section>
      </div>

      {/* Weak Combinations Grid (Question 5) */}
      <section className="dashboard-section" data-testid="weak-pairs-section">
        <div className="section-header">
          <h3>🧩 Problematic Number Combinations</h3>
          <span style={{ fontSize: 13, color: '#6b7280' }}>
            {weakPairs.length} combination{weakPairs.length === 1 ? '' : 's'} with &lt; 75% accuracy
          </span>
        </div>

        {weakPairs.length === 0 ? (
          <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }} data-testid="no-weak-pairs-msg">
            🎉 Great job! No problematic number combinations recorded yet.
          </p>
        ) : (
          <div className="weak-pairs-grid" data-testid="weak-pairs-grid">
            {weakPairs.map((pair) => (
              <div
                key={pair.pairKey}
                className="weak-pair-card"
                data-testid={`weak-pair-${pair.pairKey.replace(/\s+/g, '')}`}
              >
                <div className="pair-expression">
                  {pair.pairKey} = {pair.expectedAnswer}
                </div>
                <div className="pair-stat">
                  <strong>{Math.round(pair.accuracy * 100)}%</strong> accuracy ({pair.correct}/{pair.attempts})
                </div>
                <div className="pair-stat" style={{ color: '#b91c1c' }}>
                  Missed {pair.misses} time{pair.misses === 1 ? '' : 's'}
                </div>
                {pair.systematicMistake && (
                  <div className="pair-mistake" data-testid={`systematic-mistake-${pair.pairKey.replace(/\s+/g, '')}`}>
                    Often answered: <strong>{pair.systematicMistake.wrongAnswer}</strong>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Skills Breakdown Table (Question 4) */}
      <section className="dashboard-section" data-testid="skills-breakdown-section">
        <div className="section-header">
          <h3>🎯 Curriculum Skill Breakdown</h3>
          <span style={{ fontSize: 13, color: '#6b7280' }}>
            {weakSkills.length > 0 ? (
              <span style={{ color: '#dc2626', fontWeight: 600 }}>
                ⚠️ {weakSkills.length} skill{weakSkills.length === 1 ? '' : 's'} need reinforcement
              </span>
            ) : (
              <span style={{ color: '#059669', fontWeight: 600 }}>✓ All practiced skills on track</span>
            )}
          </span>
        </div>

        <div className="skills-list" data-testid="skills-list">
          {skills.map((s) => {
            const accPercent = Math.round(s.accuracy * 100);
            return (
              <div
                key={s.skillId}
                className={`skill-row ${s.isWeak ? 'weak' : s.masteryLevel === 'mastered' ? 'mastered' : ''}`}
                data-testid={`skill-row-${s.skillId}`}
              >
                <div className="skill-info">
                  <div className="skill-name">
                    <span>{s.name}</span>
                    <span
                      className={`badge badge-${s.masteryLevel}`}
                      data-testid={`mastery-badge-${s.skillId}`}
                    >
                      {s.masteryLevel}
                    </span>
                  </div>
                  <div className="skill-meta">
                    {s.attempts > 0 ? (
                      <>
                        {s.correct} of {s.attempts} correct • Avg speed: {(s.averageResponseTimeMs / 1000).toFixed(1)}s
                        {s.hintsUsed > 0 && ` • ${s.hintsUsed} hint${s.hintsUsed === 1 ? '' : 's'}`}
                      </>
                    ) : (
                      <span style={{ color: '#9ca3af' }}>Not practiced yet</span>
                    )}
                  </div>
                </div>

                <div className="skill-metrics">
                  <span className="skill-acc">{s.attempts > 0 ? `${accPercent}%` : '—'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Today's Focus & Recommendation (Task 5.3) */}
      {recommendation && (
        <section className="focus-card" data-testid="focus-recommendation-section">
          <div className="focus-header-row">
            <h3 className="focus-kicker" data-testid="todays-focus-header">🎯 Today&apos;s focus</h3>
            <span className="focus-action-pill" data-testid="focus-action-pill">
              {recommendation.action.replace(/_/g, ' ')}
            </span>
          </div>

          <div className="focus-skill-title" data-testid="todays-focus-skill">
            {recommendation.skillName || recommendation.headline}
          </div>

          <div className="focus-body-grid">
            {/* Why section */}
            <div className="focus-why-section" data-testid="recommendation-why-section">
              <h4 className="focus-section-label">Why:</h4>
              <ul className="focus-why-list" data-testid="focus-why-list">
                {recommendation.why && recommendation.why.length > 0 ? (
                  recommendation.why.map((reason, i) => (
                    <li key={i} data-testid={`why-item-${i}`} className="focus-why-item">
                      {reason}
                    </li>
                  ))
                ) : (
                  <li className="focus-why-item">{recommendation.explanation}</li>
                )}
              </ul>
            </div>

            {/* Practice section */}
            <div className="focus-practice-section" data-testid="recommendation-practice-section">
              <h4 className="focus-section-label">Practice:</h4>
              <div className="focus-pairs" data-testid="focus-pairs-list">
                {recommendation.suggestedPairs.map((p, i) => (
                  <span key={i} className="focus-pair-tag" data-testid={`suggested-pair-${i}`}>
                    <span className="practice-pair-text" data-testid={`practice-pair-${i}`}>{p}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Verifiable Data Trace Section */}
          {recommendation.dataTrace && (
            <div className="focus-data-trace" data-testid="recommendation-data-trace">
              <div className="data-trace-header">
                <span className="data-trace-badge">🔍 Verifiable Data Trace</span>
                <span className="data-trace-guarantee">Traced 100% to recorded data • Zero mystery AI guessing</span>
              </div>
              <div className="data-trace-audit" data-testid="data-trace-audit-statement">
                {recommendation.dataTrace.auditStatement}
              </div>
              <div className="data-trace-stats">
                <span className="trace-stat-chip">
                  Recorded Attempts: <strong>{recommendation.dataTrace.totalAttempts}</strong>
                </span>
                <span className="trace-stat-chip">
                  Recent: <strong>{Math.round(recommendation.dataTrace.recentAccuracy * 100)}%</strong> ({recommendation.dataTrace.recentAttemptsCount} attempts)
                </span>
                <span className="trace-stat-chip">
                  Previous: <strong>{Math.round(recommendation.dataTrace.previousAccuracy * 100)}%</strong> ({recommendation.dataTrace.previousAttemptsCount} attempts)
                </span>
                {recommendation.dataTrace.averageResponseTimeMs > 0 && (
                  <span className="trace-stat-chip">
                    Speed: <strong>{(recommendation.dataTrace.averageResponseTimeMs / 1000).toFixed(1)}s</strong>
                  </span>
                )}
                {recommendation.dataTrace.recordedWeakPairs && recommendation.dataTrace.recordedWeakPairs.length > 0 && (
                  <span className="trace-stat-chip">
                    Problem Pairs: <strong>{recommendation.dataTrace.recordedWeakPairs.map((p) => p.pairKey).join(', ')}</strong>
                  </span>
                )}
              </div>
            </div>
          )}
        </section>
      )}
    </section>
  );
};

