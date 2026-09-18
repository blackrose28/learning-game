import React, { useState } from 'react';
import {
  type SessionStorageAdapter,
  type PlayerRewardsState,
  type CosmeticCategory,
  type CosmeticItem,
  loadPlayerRewards,
  savePlayerRewards,
  equipCosmetic,
  getAllAchievements,
  getCosmeticsByCategory,
  getDefaultStorage,
} from '@math-archer/learning-engine';
import { ArcherGraphic } from './ArcherGraphic';
import { RangeBackdrop } from './RangeBackdrop';
import './RewardsScreen.css';
import { useGamepad, XboxButton } from '../input/useGamepad';
import type { MathArcherApiClient } from '../api/client';
import { useSafeAuth } from '../context/AuthContext';

export interface RewardsScreenProps {
  playerId?: string;
  storage?: SessionStorageAdapter;
  apiClient?: MathArcherApiClient;
  onBackToGame?: () => void;
  onRewardsChange?: (rewards: PlayerRewardsState) => void;
}

export const RewardsScreen: React.FC<RewardsScreenProps> = ({
  playerId = 'player-local',
  storage = getDefaultStorage(),
  apiClient,
  onBackToGame,
  onRewardsChange,
}) => {
  const auth = useSafeAuth();
  const activeApiClient = apiClient ?? auth?.apiClient;

  const [rewardsState, setRewardsState] = useState<PlayerRewardsState>(() =>
    loadPlayerRewards(playerId, storage)
  );

  useGamepad({
    enabled: true,
    onButtonDown: (btn) => {
      if (btn === XboxButton.B) {
        onBackToGame?.();
      }
    },
  });

  const [activeCategory, setActiveCategory] = useState<CosmeticCategory | 'achievements'>('outfit');

  const handleEquip = (category: CosmeticCategory, itemId: string) => {
    let key: 'outfit' | 'bow' | 'arrowEffect' | 'castleBanner' | 'castleStatue' | 'castleGround';
    if (category === 'outfit') key = 'outfit';
    else if (category === 'bow') key = 'bow';
    else if (category === 'arrow_effect') key = 'arrowEffect';
    else {
      // castle decoration
      if (itemId.startsWith('castle_banner_')) key = 'castleBanner';
      else if (itemId.startsWith('castle_statue_')) key = 'castleStatue';
      else key = 'castleGround';
    }

    const next = equipCosmetic(rewardsState, key, itemId);
    savePlayerRewards(next, storage);
    setRewardsState(next);
    onRewardsChange?.(next);
    activeApiClient?.updatePlayerRewards(next, playerId).catch(() => {});
  };

  const isEquipped = (item: CosmeticItem): boolean => {
    const eq = rewardsState.equippedCosmetics;
    return (
      eq.outfit === item.id ||
      eq.bow === item.id ||
      eq.arrowEffect === item.id ||
      eq.castleBanner === item.id ||
      eq.castleStatue === item.id ||
      eq.castleGround === item.id
    );
  };

  const isUnlocked = (item: CosmeticItem): boolean => {
    return rewardsState.unlockedCosmeticIds.includes(item.id);
  };

  const achievements = getAllAchievements();
  const tomorrow = rewardsState.tomorrowReward;

  return (
    <div className="rewards-screen" data-testid="rewards-screen">
      {/* Header Banner */}
      <header className="rewards-header">
        <div className="rewards-header-top">
          <div className="rewards-title-group">
            <h2>🏆 Royal Armory & Rewards</h2>
            <p className="rewards-subtitle">Customize your archer gear, bow, and castle kingdom</p>
          </div>
          {onBackToGame && (
            <button
              type="button"
              className="rewards-back-btn"
              data-testid="btn-back-to-game"
              onClick={onBackToGame}
            >
              🏹 Back to Archery Range
            </button>
          )}
        </div>

        {/* Level, XP & Streak Stats */}
        <div className="rewards-stats-bar">
          <div className="stat-item">
            <span className="stat-label">Archer Rank</span>
            <span className="stat-value" data-testid="player-level-badge">
              ⭐ Level {rewardsState.level} • {rewardsState.levelTitle}
            </span>
          </div>

          <div className="stat-item level-progress-container">
            <span className="stat-label">Level Progress</span>
            <div className="level-progress-track">
              <div
                className="level-progress-fill"
                style={{ width: `${rewardsState.levelProgressPct}%` }}
              />
            </div>
            <span className="level-progress-text" data-testid="player-xp-text">
              {rewardsState.currentLevelXp} / {rewardsState.nextLevelXp} XP (
              {rewardsState.levelProgressPct}%) • Total: {rewardsState.totalXp} XP
            </span>
          </div>

          <div className="stat-item">
            <span className="stat-label">Daily Practice Streak</span>
            <span className="stat-value" data-testid="streak-badge">
              🔥 {rewardsState.currentStreak} Days (Best: {rewardsState.bestStreak})
            </span>
          </div>
        </div>
      </header>

      {/* Tomorrow's Bounty Card - Reason to return tomorrow */}
      <section className="tomorrow-bounty-card" data-testid="tomorrow-bounty-card">
        <div className="bounty-left">
          <div className="bounty-icon-box">{tomorrow.icon}</div>
          <div>
            <div className="bounty-title-row">
              <span>🌟 Tomorrow's Daily Bounty</span>
              <span>•</span>
              <span>{tomorrow.unlockCondition}</span>
            </div>
            <h3 className="bounty-reward-title">{tomorrow.title}</h3>
            <p className="bounty-reward-desc">{tomorrow.description}</p>
          </div>
        </div>
        <div className="bounty-badge">Return Tomorrow to Unlock</div>
      </section>

      {/* Hero Showcase Stage */}
      <section className="hero-showcase-stage" data-testid="rewards-showcase">
        <div className="stage-header">
          <h3>👑 Archer & Kingdom Inspection</h3>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Live preview of your equipped gear and castle
          </span>
        </div>

        <div className="stage-viewport">
          <div className="stage-backdrop-wrapper">
            <RangeBackdrop
              areaId="castle"
              equippedBanner={rewardsState.equippedCosmetics.castleBanner}
              equippedStatue={rewardsState.equippedCosmetics.castleStatue}
              equippedGround={rewardsState.equippedCosmetics.castleGround}
            />
          </div>
          <div className="stage-archer-preview">
            <ArcherGraphic
              state="drawing"
              equippedOutfit={rewardsState.equippedCosmetics.outfit}
              equippedBow={rewardsState.equippedCosmetics.bow}
            />
          </div>
        </div>
      </section>

      {/* Category Navigation Tabs */}
      <nav className="rewards-tabs-nav" data-testid="armory-category-nav">
        <button
          type="button"
          className={`rewards-tab-btn ${activeCategory === 'outfit' ? 'active' : ''}`}
          data-testid="tab-cat-outfit"
          onClick={() => setActiveCategory('outfit')}
        >
          🧥 Outfits & Cowls
        </button>
        <button
          type="button"
          className={`rewards-tab-btn ${activeCategory === 'bow' ? 'active' : ''}`}
          data-testid="tab-cat-bow"
          onClick={() => setActiveCategory('bow')}
        >
          🏹 Bow Skins
        </button>
        <button
          type="button"
          className={`rewards-tab-btn ${activeCategory === 'arrow_effect' ? 'active' : ''}`}
          data-testid="tab-cat-effects"
          onClick={() => setActiveCategory('arrow_effect')}
        >
          ✨ Arrow Effects
        </button>
        <button
          type="button"
          className={`rewards-tab-btn ${activeCategory === 'castle_decoration' ? 'active' : ''}`}
          data-testid="tab-cat-castle"
          onClick={() => setActiveCategory('castle_decoration')}
        >
          🏰 Castle Decorations
        </button>
        <button
          type="button"
          className={`rewards-tab-btn ${activeCategory === 'achievements' ? 'active' : ''}`}
          data-testid="tab-cat-achievements"
          onClick={() => setActiveCategory('achievements')}
        >
          🏆 Trophy Wall ({rewardsState.unlockedAchievementIds.length}/{achievements.length})
        </button>
      </nav>

      {/* Cosmetics Grid */}
      {activeCategory !== 'achievements' ? (
        <div className="cosmetics-grid" data-testid="cosmetics-grid">
          {getCosmeticsByCategory(activeCategory).map((item) => {
            const equipped = isEquipped(item);
            const unlocked = isUnlocked(item);

            return (
              <div
                key={item.id}
                className={`cosmetic-card ${equipped ? 'is-equipped' : ''} ${
                  !unlocked ? 'is-locked' : ''
                }`}
                data-testid={`cosmetic-card-${item.id}`}
              >
                <div className="card-top">
                  <div className="cosmetic-icon-circle">{item.icon}</div>
                  <div className="cosmetic-meta">
                    <span className={`cosmetic-rarity-chip rarity-${item.rarity}`}>
                      {item.rarity}
                    </span>
                    <h4 className="cosmetic-name">{item.name}</h4>
                    <p className="cosmetic-desc">{item.description}</p>
                  </div>
                </div>

                <div className="card-bottom">
                  <div className="card-status-badge">
                    {equipped ? (
                      <span className="badge-equipped" data-testid={`status-equipped-${item.id}`}>
                        ✅ Equipped
                      </span>
                    ) : unlocked ? (
                      <span style={{ color: '#2563eb', fontWeight: 600 }}>Unlocked</span>
                    ) : (
                      <span className="badge-locked" data-testid={`status-locked-${item.id}`}>
                        🔒 {item.unlockDescription}
                      </span>
                    )}
                  </div>

                  {unlocked && !equipped && (
                    <button
                      type="button"
                      className="equip-btn"
                      data-testid={`equip-${item.id}`}
                      onClick={() => handleEquip(item.category, item.id)}
                    >
                      Equip
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Trophy Wall / Achievements */
        <div className="achievements-wall" data-testid="achievements-wall">
          <div className="achievements-header">
            <h3>🏆 Archery Achievements</h3>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
              Special milestones honoring effort, resilience, and daily practice.
            </p>
          </div>

          <div className="achievements-grid">
            {achievements.map((ach) => {
              const isUnlocked = rewardsState.unlockedAchievementIds.includes(ach.id);
              return (
                <div
                  key={ach.id}
                  className={`achievement-card ${isUnlocked ? 'is-unlocked' : 'is-locked'}`}
                  data-testid={`ach-card-${ach.id}`}
                >
                  <div className="ach-icon-box">{ach.icon}</div>
                  <div className="ach-info">
                    <h4>{ach.title}</h4>
                    <p>{ach.description}</p>
                    <span className="ach-reward-chip">
                      {isUnlocked ? `⭐ Claimed +${ach.xpReward} XP` : `+${ach.xpReward} XP Reward`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
