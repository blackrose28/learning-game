import React, { useState } from 'react';
import {
  getAllWorldAreas,
  loadWorldProgression,
  saveActiveArea,
  getNextLockableArea,
  type WorldAreaId,
  type WorldArea,
  type SessionStorageAdapter,
} from '@math-archer/learning-engine';
import './WorldMap.css';
import { useGamepad, XboxButton } from '../input/useGamepad';
import type { MathArcherApiClient } from '../api/client';
import { useSafeAuth } from '../context/AuthContext';

export interface WorldMapProps {
  playerId?: string;
  storage?: SessionStorageAdapter;
  apiClient?: MathArcherApiClient;
  onSelectArea?: (areaId: WorldAreaId) => void;
  onBackToGame?: () => void;
}

export const WorldMap: React.FC<WorldMapProps> = ({
  playerId = 'player-local',
  storage,
  apiClient,
  onSelectArea,
  onBackToGame,
}) => {
  const auth = useSafeAuth();
  const activeApiClient = apiClient ?? auth?.apiClient;

  const [progression, setProgression] = useState(() => loadWorldProgression(playerId, storage));
  const allAreas = getAllWorldAreas();
  const nextLockable = getNextLockableArea(progression.completedSessionsCount);

  useGamepad({
    enabled: true,
    onButtonDown: (btn) => {
      if (btn === XboxButton.B) {
        onBackToGame?.();
      }
    },
  });

  const handleSelectArea = (areaId: WorldAreaId) => {
    if (!progression.unlockedAreaIds.includes(areaId)) return;
    const updated = saveActiveArea(playerId, areaId, storage, progression.completedSessionsCount);
    setProgression(updated);
    onSelectArea?.(areaId);
    activeApiClient?.updateWorldProgression(updated, playerId).catch(() => {});
  };


  const unlockedCount = progression.unlockedAreaIds.length;
  const totalCount = allAreas.length;

  return (
    <div className="world-map-container" data-testid="world-map-container">
      {/* World Map Header */}
      <header className="world-map-header">
        <div className="world-map-header-top">
          <div>
            <h2 className="world-map-title" data-testid="world-map-title">
              🗺️ Archery World Map
            </h2>
            <p className="world-map-subtitle">
              Explore elemental realms and conquer math challenges across the kingdom!
            </p>
          </div>
          {onBackToGame && (
            <button
              type="button"
              className="back-to-game-btn"
              data-testid="back-to-game-btn"
              onClick={onBackToGame}
            >
              🏹 Back to Archery Range
            </button>
          )}
        </div>

        {/* Progression Overview Bar */}
        <div className="world-progression-bar" data-testid="world-progression-bar">
          <div className="world-progress-stat">
            <span className="stat-label">Exploration Progress:</span>
            <span className="stat-value" data-testid="unlocked-areas-count">
              <strong>{unlockedCount}</strong> / {totalCount} Realms Discovered
            </span>
          </div>

          <div className="world-progress-meter">
            <div
              className="world-progress-fill"
              style={{ width: `${Math.round((unlockedCount / totalCount) * 100)}%` }}
            />
          </div>

          <div className="world-next-unlock" data-testid="next-unlock-info">
            {nextLockable ? (
              <span>
                🔒 Next Realm:{' '}
                <strong>
                  {nextLockable.area.icon} {nextLockable.area.name}
                </strong>{' '}
                (unlocks in{' '}
                <strong>
                  {nextLockable.sessionsRemaining} more session
                  {nextLockable.sessionsRemaining > 1 ? 's' : ''}
                </strong>
                )
              </span>
            ) : (
              <span className="all-unlocked-banner">
                🌟 All Realms Discovered! Master of All Elements!
              </span>
            )}
          </div>
        </div>
      </header>

      {/* World Map Sequential Progression Path View */}
      <div
        className="world-map-schema-view world-progression-path"
        data-testid="world-map-schema-view"
      >
        {allAreas.map((area, index) => {
          const isUnlocked = progression.unlockedAreaIds.includes(area.id);
          const isActive = progression.activeAreaId === area.id;
          const isLast = index === allAreas.length - 1;
          const nextArea = !isLast ? allAreas[index + 1] : null;
          const isNextUnlocked = nextArea
            ? progression.unlockedAreaIds.includes(nextArea.id)
            : false;

          return (
            <React.Fragment key={area.id}>
              <div className="progression-row">
                <div className="progression-step-indicator" aria-hidden="true">
                  <div
                    className={`step-circle ${isUnlocked ? 'unlocked' : 'locked'} ${
                      isActive ? 'active' : ''
                    }`}
                  >
                    {isActive ? '🏹' : isUnlocked ? '✓' : index + 1}
                  </div>
                  <span className="step-label">Stage {index + 1}</span>
                </div>

                <div className="progression-card-container">
                  {renderAreaCard(
                    area,
                    isUnlocked,
                    isActive,
                    progression.completedSessionsCount,
                    handleSelectArea
                  )}
                </div>
              </div>

              {!isLast && (
                <div
                  className={`progression-connector-line ${isNextUnlocked ? 'unlocked' : 'locked'}`}
                  aria-hidden="true"
                >
                  <div className="connector-stem" />
                  <div className="connector-arrow">▼</div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

function renderAreaCard(
  area: WorldArea,
  isUnlocked: boolean,
  isActive: boolean,
  completedSessionsCount: number,
  onSelect: (id: WorldAreaId) => void
) {
  return (
    <article
      key={area.id}
      className={`realm-card ${isUnlocked ? 'unlocked' : 'locked'} ${isActive ? 'active' : ''} area-${area.id}`}
      data-testid={`realm-card-${area.id}`}
      data-area-id={area.id}
      data-unlocked={isUnlocked}
      data-active={isActive}
    >
      <div className="realm-card-header">
        <span className="realm-card-icon" role="img" aria-label={area.name}>
          {area.icon}
        </span>
        <div className="realm-card-title-box">
          <h3 className="realm-card-name">{area.name}</h3>
          <span className="realm-card-tag">{area.title}</span>
        </div>
        <div className="realm-badge-container">
          {isActive ? (
            <span
              className="realm-status-badge badge-active"
              data-testid={`badge-active-${area.id}`}
            >
              ✨ Active Realm
            </span>
          ) : isUnlocked ? (
            <span
              className="realm-status-badge badge-unlocked"
              data-testid={`badge-unlocked-${area.id}`}
            >
              ✅ Unlocked
            </span>
          ) : (
            <span
              className="realm-status-badge badge-locked"
              data-testid={`badge-locked-${area.id}`}
            >
              🔒 Locked
            </span>
          )}
        </div>
      </div>

      <p className="realm-card-description">{area.description}</p>

      <div className="realm-pedagogy-chip">
        <span className="pedagogy-icon">🎯</span>
        <span className="pedagogy-text">{area.pedagogicalFocus}</span>
      </div>

      <div className="realm-card-footer">
        {!isUnlocked ? (
          <div className="realm-unlock-requirement" data-testid={`unlock-req-${area.id}`}>
            <span className="req-label">
              Requires <strong>{area.sessionsRequired}</strong> completed sessions
            </span>
            <span className="req-progress">
              ({completedSessionsCount} / {area.sessionsRequired} completed)
            </span>
          </div>
        ) : (
          <button
            type="button"
            className={`travel-area-btn ${isActive ? 'current' : ''}`}
            data-testid={`travel-btn-${area.id}`}
            onClick={() => onSelect(area.id)}
            disabled={isActive}
          >
            {isActive ? '📍 Currently Practicing Here' : '🏹 Travel to Realm'}
          </button>
        )}
      </div>
    </article>
  );
}
