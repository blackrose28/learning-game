import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  loadParentDashboard,
  computeParentDashboardData,
  createSimulatedProfile,
  type ParentDashboardData,
  type Attempt,
  type DailySession,
} from '@math-archer/learning-engine';
import { useSafeAuth } from '../context/AuthContext';
import type { ChildPublicProfile } from '../api/client';
import './ParentDashboard.css';

interface ParentDashboardProps {
  playerId?: string;
}

export const AVATAR_OPTIONS = [
  { id: 'archer-1', emoji: '🏹', label: 'Classic' },
  { id: 'archer-2', emoji: '🎯', label: 'Target' },
  { id: 'archer-fire', emoji: '🔥', label: 'Fire' },
  { id: 'archer-ice', emoji: '❄️', label: 'Ice' },
  { id: 'archer-wind', emoji: '💨', label: 'Wind' },
  { id: 'archer-earth', emoji: '🌿', label: 'Earth' },
];

export const GRADE_OPTIONS = ['Kindergarten', '1st Grade', '2nd Grade', '3rd Grade', '4th Grade'];

/**
 * Creates realistic sample data for previewing the parent dashboard
 * when no real attempts exist yet.
 */
function createRealisticSampleData(): ParentDashboardData {
  const simulatedProfile = createSimulatedProfile({
    playerId: 'sample-player',
    skills: {
      make_10: { level: 'strong', accuracy: 0.9, attempts: 30, averageResponseTimeMs: 2800 },
      basic_addition: {
        level: 'mastered',
        accuracy: 0.97,
        attempts: 35,
        averageResponseTimeMs: 1800,
      },
      cross_10_addition: {
        level: 'weak',
        accuracy: 0.51,
        recentAccuracy: 0.64,
        attempts: 28,
        averageResponseTimeMs: 4600,
      },
      basic_subtraction: {
        level: 'strong',
        accuracy: 0.89,
        attempts: 25,
        averageResponseTimeMs: 2500,
      },
      cross_10_subtraction: {
        level: 'developing',
        accuracy: 0.68,
        attempts: 24,
        averageResponseTimeMs: 5900,
        hintsUsed: 5,
      },
    },
    pairs: {
      '13 + 8': { attempts: 6, correct: 2, accuracy: 0.33, averageResponseTimeMs: 4800 },
      '17 - 9': { attempts: 5, correct: 2, accuracy: 0.4, averageResponseTimeMs: 5200 },
      '14 + 7': { attempts: 5, correct: 3, accuracy: 0.6, averageResponseTimeMs: 4900 },
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
  const authContext = useSafeAuth();

  const [useSample, setUseSample] = useState<boolean>(false);
  const [data, setData] = useState<ParentDashboardData | null>(null);
  const [selectedChildId, setSelectedChildId] = useState<string>(playerId);
  const [showManageModal, setShowManageModal] = useState<boolean>(false);
  const [showAddChildModal, setShowAddChildModal] = useState<boolean>(false);
  const [editingChild, setEditingChild] = useState<ChildPublicProfile | null>(null);
  const [deletingChild, setDeletingChild] = useState<ChildPublicProfile | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  // Add form fields
  const [addName, setAddName] = useState<string>('');
  const [addPin, setAddPin] = useState<string>('');
  const [addAvatar, setAddAvatar] = useState<string>('archer-1');
  const [addGrade, setAddGrade] = useState<string>('1st Grade');

  // Edit form fields
  const [editName, setEditName] = useState<string>('');
  const [editPin, setEditPin] = useState<string>('');
  const [editAvatar, setEditAvatar] = useState<string>('archer-1');
  const [editGrade, setEditGrade] = useState<string>('1st Grade');
  const [removePin, setRemovePin] = useState<boolean>(false);

  const effectivePlayerId = selectedChildId || authContext?.activeChild?.id || playerId;
  const selectedChildObj = authContext?.availableChildren.find((c) => c.id === effectivePlayerId);

  const loadData = useCallback(() => {
    if (useSample) {
      setData(createRealisticSampleData());
    } else {
      const liveData = loadParentDashboard(effectivePlayerId);
      setData(liveData);
    }
  }, [useSample, effectivePlayerId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleSample = () => {
    setUseSample((prev) => !prev);
  };

  const openAddChild = () => {
    setAddName('');
    setAddPin('');
    setAddAvatar('archer-1');
    setAddGrade('1st Grade');
    setModalError(null);
    setShowAddChildModal(true);
  };

  const handleAddChildSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim() || !authContext) return;
    setModalError(null);
    try {
      const created = await authContext.addChild({
        name: addName.trim(),
        pin: addPin.trim() || undefined,
        avatar: addAvatar,
        grade: addGrade,
      });
      setSelectedChildId(created.id);
      setShowAddChildModal(false);
      loadData();
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : 'Failed to add child profile');
    }
  };

  const openEditChild = (child: ChildPublicProfile) => {
    setEditingChild(child);
    setEditName(child.name);
    setEditPin('');
    setEditAvatar(child.avatar || 'archer-1');
    setEditGrade(child.grade || '1st Grade');
    setRemovePin(false);
    setModalError(null);
  };

  const handleEditChildSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChild || !editName.trim() || !authContext) return;
    setModalError(null);
    try {
      const pinUpdate = removePin ? '' : editPin.trim() ? editPin.trim() : undefined;
      await authContext.updateChild(editingChild.id, {
        name: editName.trim(),
        pin: pinUpdate,
        avatar: editAvatar,
        grade: editGrade,
      });
      setEditingChild(null);
      loadData();
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : 'Failed to update child profile');
    }
  };

  const openDeleteChild = (child: ChildPublicProfile) => {
    setDeletingChild(child);
    setModalError(null);
  };

  const handleConfirmDeleteChild = async () => {
    if (!deletingChild || !authContext) return;
    setModalError(null);
    try {
      const targetId = deletingChild.id;
      await authContext.deleteChild(targetId);
      if (selectedChildId === targetId) {
        const remaining = authContext.availableChildren.filter((c) => c.id !== targetId);
        if (remaining.length > 0) {
          setSelectedChildId(remaining[0].id);
        }
      }
      setDeletingChild(null);
      loadData();
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : 'Failed to delete child profile');
    }
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

  const {
    today,
    overall,
    operationComparison,
    skills,
    weakSkills,
    weakPairs,
    trend,
    recommendation,
  } = data;

  return (
    <section className="parent-dashboard" data-testid="parent-dashboard-view">
      {/* Header */}
      <header className="dashboard-header">
        <div>
          <h2>👨‍👩‍👧 Parent Dashboard</h2>
          <p>
            Clear pedagogical insights into your child&apos;s daily practice, mastery, and growth.
          </p>
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
          {authContext && (
            <button
              type="button"
              className="btn-secondary"
              data-testid="lock-parent-dashboard-btn"
              onClick={authContext.lockParent}
              style={{ borderColor: '#fca5a5', color: '#b91c1c', fontWeight: 700 }}
            >
              🔒 Lock Dashboard
            </button>
          )}
        </div>
      </header>

      {/* Child Profile Switcher & Tenant Info */}
      {authContext && authContext.availableChildren && authContext.availableChildren.length > 0 && (
        <div
          data-testid="parent-child-switcher-bar"
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: '12px 16px',
            marginBottom: 20,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>Viewing Child:</span>
            {authContext.availableChildren.map((c) => {
              const isSelected = effectivePlayerId === c.id;
              const emoji = AVATAR_OPTIONS.find((a) => a.id === c.avatar)?.emoji || '🏹';
              return (
                <button
                  key={c.id}
                  type="button"
                  data-testid={`select-child-btn-${c.id}`}
                  onClick={() => setSelectedChildId(c.id)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 20,
                    border: isSelected ? '2px solid #2563eb' : '1px solid #cbd5e1',
                    background: isSelected ? '#eff6ff' : '#ffffff',
                    color: isSelected ? '#1d4ed8' : '#334155',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span>{emoji}</span>
                  <span>{c.name}</span>
                </button>
              );
            })}

            {/* Quick Edit for current child */}
            {selectedChildObj && (
              <button
                type="button"
                data-testid="quick-edit-child-btn"
                onClick={() => openEditChild(selectedChildObj)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 20,
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#334155',
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                ✏️ Edit {selectedChildObj.name}
              </button>
            )}

            <button
              type="button"
              data-testid="manage-profiles-btn"
              onClick={() => setShowManageModal(true)}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#334155',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              ⚙️ Manage Profiles
            </button>

            <button
              type="button"
              data-testid="add-child-profile-btn"
              onClick={openAddChild}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                border: '1px dashed #94a3b8',
                background: '#ffffff',
                color: '#475569',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              + Add Child
            </button>
          </div>

          <div style={{ fontSize: 12, color: '#64748b' }}>
            👨‍👩‍👧 Account: <strong>{authContext.parentUser?.name || 'Demo Parent'}</strong>
          </div>
        </div>
      )}

      {/* Manage Profiles Modal */}
      {showManageModal && (
        <div className="child-picker-overlay" data-testid="manage-children-modal">
          <div className="child-picker-modal" style={{ maxWidth: 540, textAlign: 'left' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: 18,
                  color: '#111827',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                ⚙️ Manage Child Profiles
              </h3>
              <button
                type="button"
                data-testid="close-manage-children-btn"
                onClick={() => setShowManageModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 18,
                  cursor: 'pointer',
                  color: '#6b7280',
                }}
              >
                ✕
              </button>
            </div>

            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748b' }}>
              Add children, update names and grade levels, manage or remove 4-digit passcodes, and
              delete profiles.
            </p>

            <div className="child-manage-list" data-testid="child-manage-list">
              {authContext?.availableChildren.map((child) => {
                const emoji = AVATAR_OPTIONS.find((a) => a.id === child.avatar)?.emoji || '🏹';
                return (
                  <div
                    key={child.id}
                    className="child-manage-item"
                    data-testid={`child-manage-row-${child.id}`}
                  >
                    <div className="child-manage-info">
                      <div className="child-manage-avatar">{emoji}</div>
                      <div className="child-manage-details">
                        <h4>{child.name}</h4>
                        <div className="child-manage-meta">
                          <span>{child.grade}</span>
                          <span className={`pin-badge ${child.hasPin ? 'pin-locked' : 'pin-open'}`}>
                            {child.hasPin ? '🔒 PIN Protected' : '🔓 No PIN'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="child-manage-actions">
                      <button
                        type="button"
                        data-testid={`edit-child-btn-${child.id}`}
                        onClick={() => openEditChild(child)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 6,
                          border: '1px solid #d1d5db',
                          background: '#fff',
                          color: '#374151',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        type="button"
                        data-testid={`delete-child-btn-${child.id}`}
                        onClick={() => openDeleteChild(child)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 6,
                          border: '1px solid #fca5a5',
                          background: '#fff5f5',
                          color: '#dc2626',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 20,
              }}
            >
              <button
                type="button"
                data-testid="manage-add-child-btn"
                onClick={openAddChild}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: '1px dashed #2563eb',
                  background: '#eff6ff',
                  color: '#1d4ed8',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                + Add Another Child
              </button>
              <button
                type="button"
                data-testid="done-manage-children-btn"
                onClick={() => setShowManageModal(false)}
                style={{
                  padding: '8px 18px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#2563eb',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Child Modal */}
      {showAddChildModal && (
        <div className="child-picker-overlay" data-testid="add-child-modal">
          <div className="child-picker-modal" style={{ maxWidth: 440, textAlign: 'left' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 18, color: '#111827' }}>
              Add Child Profile
            </h3>

            {modalError && (
              <div className="modal-error-banner" data-testid="add-child-error">
                {modalError}
              </div>
            )}

            <form onSubmit={handleAddChildSubmit}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                  Child Name *
                </label>
                <input
                  type="text"
                  data-testid="new-child-name-input"
                  required
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="e.g. Leo"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #d1d5db',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                  Grade Level
                </label>
                <select
                  data-testid="new-child-grade-select"
                  value={addGrade}
                  onChange={(e) => setAddGrade(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #d1d5db',
                    background: '#fff',
                    boxSizing: 'border-box',
                  }}
                >
                  {GRADE_OPTIONS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                  Choose Avatar
                </label>
                <div className="avatar-selector-grid" data-testid="new-child-avatar-grid">
                  {AVATAR_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      data-testid={`avatar-option-${opt.id}`}
                      className={`avatar-selector-btn ${addAvatar === opt.id ? 'selected' : ''}`}
                      onClick={() => setAddAvatar(opt.id)}
                    >
                      <span style={{ fontSize: 16 }}>{opt.emoji}</span>
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                  4-Digit PIN / Passcode (Optional)
                </label>
                <input
                  type="text"
                  data-testid="new-child-pin-input"
                  maxLength={4}
                  value={addPin}
                  onChange={(e) => setAddPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 1234 (leave blank for quick start)"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #d1d5db',
                    boxSizing: 'border-box',
                  }}
                />
                <span style={{ fontSize: 12, color: '#64748b', display: 'block', marginTop: 4 }}>
                  If left blank, child can start without entering a passcode.
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button
                  type="button"
                  data-testid="cancel-add-child-btn"
                  onClick={() => setShowAddChildModal(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: '1px solid #d1d5db',
                    background: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  data-testid="save-new-child-btn"
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: 'none',
                    background: '#2563eb',
                    color: '#fff',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Create Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Child Modal */}
      {editingChild && (
        <div className="child-picker-overlay" data-testid="edit-child-modal">
          <div className="child-picker-modal" style={{ maxWidth: 440, textAlign: 'left' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 18, color: '#111827' }}>
              Edit Child Profile: {editingChild.name}
            </h3>

            {modalError && (
              <div className="modal-error-banner" data-testid="edit-child-error">
                {modalError}
              </div>
            )}

            <form onSubmit={handleEditChildSubmit}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                  Child Name *
                </label>
                <input
                  type="text"
                  data-testid="edit-child-name-input"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #d1d5db',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                  Grade Level
                </label>
                <select
                  data-testid="edit-child-grade-select"
                  value={editGrade}
                  onChange={(e) => setEditGrade(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #d1d5db',
                    background: '#fff',
                    boxSizing: 'border-box',
                  }}
                >
                  {GRADE_OPTIONS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                  Choose Avatar
                </label>
                <div className="avatar-selector-grid" data-testid="edit-child-avatar-grid">
                  {AVATAR_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      data-testid={`edit-avatar-option-${opt.id}`}
                      className={`avatar-selector-btn ${editAvatar === opt.id ? 'selected' : ''}`}
                      onClick={() => setEditAvatar(opt.id)}
                    >
                      <span style={{ fontSize: 16 }}>{opt.emoji}</span>
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div
                style={{
                  marginBottom: 14,
                  background: '#f8fafc',
                  padding: 12,
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                }}
              >
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                  4-Digit PIN / Passcode
                </label>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
                  Status:{' '}
                  {editingChild.hasPin ? '🔒 Currently PIN Protected' : '🔓 Currently No PIN'}
                </div>
                {!removePin && (
                  <input
                    type="text"
                    data-testid="edit-child-pin-input"
                    maxLength={4}
                    value={editPin}
                    onChange={(e) => setEditPin(e.target.value.replace(/\D/g, ''))}
                    placeholder={
                      editingChild.hasPin
                        ? 'Enter new PIN (or leave empty to keep current)'
                        : 'Enter 4-digit PIN'
                    }
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid #d1d5db',
                      boxSizing: 'border-box',
                      marginBottom: 8,
                    }}
                  />
                )}
                {editingChild.hasPin && (
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 12,
                      color: '#374151',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      data-testid="remove-child-pin-checkbox"
                      checked={removePin}
                      onChange={(e) => setRemovePin(e.target.checked)}
                    />
                    Remove PIN requirement (allow 1-click start without PIN)
                  </label>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button
                  type="button"
                  data-testid="cancel-edit-child-btn"
                  onClick={() => setEditingChild(null)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: '1px solid #d1d5db',
                    background: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  data-testid="save-edit-child-btn"
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: 'none',
                    background: '#2563eb',
                    color: '#fff',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Child Confirmation Dialog */}
      {deletingChild && (
        <div className="child-picker-overlay" data-testid="delete-child-modal">
          <div className="child-picker-modal" style={{ maxWidth: 420, textAlign: 'left' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 18, color: '#b91c1c' }}>
              Delete Child Profile?
            </h3>

            {modalError && (
              <div className="modal-error-banner" data-testid="delete-child-error">
                {modalError}
              </div>
            )}

            <div className="delete-warning-box">
              ⚠️ Are you sure you want to delete <strong>{deletingChild.name}</strong>? This action
              cannot be undone. All recorded attempts, accuracy statistics, and practice history for{' '}
              {deletingChild.name} will be permanently deleted.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button
                type="button"
                data-testid="cancel-delete-child-btn"
                onClick={() => setDeletingChild(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: '1px solid #d1d5db',
                  background: '#fff',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="confirm-delete-child-btn"
                onClick={handleConfirmDeleteChild}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#dc2626',
                  color: '#fff',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Yes, Delete Profile
              </button>
            </div>
          </div>
        </div>
      )}

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
            💡 <strong>Preview Mode:</strong> Displaying realistic practice data with 5 daily
            sessions, 142 attempts, and targeted focus areas.
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
              + {Math.round(overall.additionAccuracy * 100)}% vs -{' '}
              {Math.round(overall.subtractionAccuracy * 100)}%
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
              {weakSkills.length > 0
                ? weakSkills.map((s) => s.name).join(', ')
                : 'All active skills solid'}
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
                ? weakPairs
                    .slice(0, 3)
                    .map((p) => p.pairKey)
                    .join(', ')
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
                No daily session history yet. Shoot arrows in Game Screen to populate daily
                progress!
              </p>
            ) : (
              <div className="chart-bars" data-testid="history-chart-bars">
                {chartHistory.map((point) => {
                  const accPercent = Math.round(point.accuracy * 100);
                  const isHigh = accPercent >= 80;
                  const isLow = accPercent < 65;
                  return (
                    <div
                      key={point.date}
                      className="chart-bar-group"
                      data-testid={`chart-bar-${point.date}`}
                    >
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

            <p
              style={{ fontSize: 13, color: '#4b5563', margin: '6px 0 0' }}
              data-testid="trend-summary-text"
            >
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
                  <strong>{Math.round(pair.accuracy * 100)}%</strong> accuracy ({pair.correct}/
                  {pair.attempts})
                </div>
                <div className="pair-stat" style={{ color: '#b91c1c' }}>
                  Missed {pair.misses} time{pair.misses === 1 ? '' : 's'}
                </div>
                {pair.systematicMistake && (
                  <div
                    className="pair-mistake"
                    data-testid={`systematic-mistake-${pair.pairKey.replace(/\s+/g, '')}`}
                  >
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
              <span style={{ color: '#059669', fontWeight: 600 }}>
                ✓ All practiced skills on track
              </span>
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
                        {s.correct} of {s.attempts} correct • Avg speed:{' '}
                        {(s.averageResponseTimeMs / 1000).toFixed(1)}s
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
            <h3 className="focus-kicker" data-testid="todays-focus-header">
              🎯 Today&apos;s focus
            </h3>
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
                    <span className="practice-pair-text" data-testid={`practice-pair-${i}`}>
                      {p}
                    </span>
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
                <span className="data-trace-guarantee">
                  Traced 100% to recorded data • Zero mystery AI guessing
                </span>
              </div>
              <div className="data-trace-audit" data-testid="data-trace-audit-statement">
                {recommendation.dataTrace.auditStatement}
              </div>
              <div className="data-trace-stats">
                <span className="trace-stat-chip">
                  Recorded Attempts: <strong>{recommendation.dataTrace.totalAttempts}</strong>
                </span>
                <span className="trace-stat-chip">
                  Recent:{' '}
                  <strong>{Math.round(recommendation.dataTrace.recentAccuracy * 100)}%</strong> (
                  {recommendation.dataTrace.recentAttemptsCount} attempts)
                </span>
                <span className="trace-stat-chip">
                  Previous:{' '}
                  <strong>{Math.round(recommendation.dataTrace.previousAccuracy * 100)}%</strong> (
                  {recommendation.dataTrace.previousAttemptsCount} attempts)
                </span>
                {recommendation.dataTrace.averageResponseTimeMs > 0 && (
                  <span className="trace-stat-chip">
                    Speed:{' '}
                    <strong>
                      {(recommendation.dataTrace.averageResponseTimeMs / 1000).toFixed(1)}s
                    </strong>
                  </span>
                )}
                {recommendation.dataTrace.recordedWeakPairs &&
                  recommendation.dataTrace.recordedWeakPairs.length > 0 && (
                    <span className="trace-stat-chip">
                      Problem Pairs:{' '}
                      <strong>
                        {recommendation.dataTrace.recordedWeakPairs
                          .map((p) => p.pairKey)
                          .join(', ')}
                      </strong>
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
