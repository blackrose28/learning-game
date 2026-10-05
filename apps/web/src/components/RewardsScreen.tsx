import { CHARACTER_PROFILES, getCharacterCosmetic } from '@math-archer/learning-engine';
import React, { useEffect, useState } from 'react';
import { audioFx } from '../audio/AudioFx';
import {
  type SessionStorageAdapter,
  type PlayerRewardsState,
  type CosmeticCategory,
  type CosmeticItem,
  type AchievementCategory,
  type WorldAreaId,
  type CharacterType,
  type TargetType,
  loadPlayerRewards,
  savePlayerRewards,
  equipCosmetic,
  switchCharacter,
  switchTarget,
  getAllAchievements,
  getCosmeticsByCategory,
  getDefaultStorage,
  loadWorldProgression,
  getWorldArea,
  getCosmeticItem,
} from '@math-archer/learning-engine';
import { CharacterGraphic } from './CharacterGraphic';
import { TargetGraphic } from './TargetGraphic';
import { ElementalArrowGraphic } from './ElementalArrowGraphic';
import { RangeBackdrop } from './RangeBackdrop';
import './RewardsScreen.css';
import { useGamepad, XboxButton } from '../input/useGamepad';
import type { MathArcherApiClient } from '../api/client';
import { useSafeAuth } from '../context/AuthContext';

export interface RewardsScreenProps {
  playerId?: string;
  storage?: SessionStorageAdapter;
  apiClient?: MathArcherApiClient;
  initialAreaId?: WorldAreaId;
  onBackToGame?: () => void;
  onRewardsChange?: (rewards: PlayerRewardsState) => void;
}

export const RewardsScreen: React.FC<RewardsScreenProps> = ({
  playerId = 'player-local',
  storage = getDefaultStorage(),
  apiClient,
  initialAreaId,
  onBackToGame,
  onRewardsChange,
}) => {
  const auth = useSafeAuth();
  const activeApiClient = apiClient ?? auth?.apiClient;

  const [rewardsState, setRewardsState] = useState<PlayerRewardsState>(() =>
    loadPlayerRewards(playerId, storage)
  );

  const [worldProgression] = useState(() => loadWorldProgression(playerId, storage));
  const [inspectedAreaId, setInspectedAreaId] = useState<WorldAreaId>(
    initialAreaId || worldProgression.activeAreaId || 'castle'
  );
  const [testShotActive, setTestShotActive] = useState(false);
  const [testShotReloading, setTestShotReloading] = useState(false);
  const [testShotReleased, setTestShotReleased] = useState(false);

  const activeCharacter: CharacterType = rewardsState.equippedCosmetics?.character || 'archer';
  const hero = CHARACTER_PROFILES[activeCharacter];
  const activeTarget: TargetType = rewardsState.equippedCosmetics?.target || 'archery_target';

  const handleSwitchCharacter = (char: CharacterType) => {
    if (char === activeCharacter) return;
    setTestShotActive(false);
    setTestShotReloading(false);
    setTestShotReleased(false);
    const next = switchCharacter(rewardsState, char);
    savePlayerRewards(next, storage);
    setRewardsState(next);
    onRewardsChange?.(next);
    activeApiClient?.updatePlayerRewards(next, playerId).catch(() => {});
  };

  const handleSwitchTarget = (tgt: TargetType) => {
    if (tgt === activeTarget) return;
    const next = switchTarget(rewardsState, tgt);
    savePlayerRewards(next, storage);
    setRewardsState(next);
    onRewardsChange?.(next);
    activeApiClient?.updatePlayerRewards(next, playerId).catch(() => {});
  };

  useEffect(() => {
    if (!testShotActive) return;
    setTestShotReleased(true);
    audioFx.playCharacterAttack(activeCharacter, 'fire');
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (activeCharacter === 'gunner') {
      timers.push(
        setTimeout(() => {
          setTestShotReleased(false);
          setTestShotReloading(true);
          audioFx.playShotgunReload();
        }, 160)
      );
      timers.push(setTimeout(() => setTestShotReloading(false), 800));
    }
    timers.push(
      setTimeout(() => {
        setTestShotActive(false);
        setTestShotReleased(false);
      }, 1800)
    );
    return () => timers.forEach(clearTimeout);
  }, [testShotActive, activeCharacter]);

  const handleTriggerTestShot = () => {
    if (testShotActive) return;
    setTestShotActive(true);
  };

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

    if (category === 'arrow_effect' || category === 'bow') {
      handleTriggerTestShot();
    }
  };

  const outfitItem = getCosmeticItem(rewardsState.equippedCosmetics.outfit);
  const bowItem = getCosmeticItem(rewardsState.equippedCosmetics.bow);
  const effectItem = getCosmeticItem(rewardsState.equippedCosmetics.arrowEffect);
  const bannerItem = getCosmeticItem(rewardsState.equippedCosmetics.castleBanner);
  const statueItem = getCosmeticItem(rewardsState.equippedCosmetics.castleStatue);
  const groundItem = getCosmeticItem(rewardsState.equippedCosmetics.castleGround);

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

  const [trophyFilter, setTrophyFilter] = useState<AchievementCategory | 'all'>('all');

  const getAchievementProgressText = (achId: string): string | null => {
    const prog = rewardsState.achievementProgress;
    if (achId === 'ach_arrows_100')
      return `Progress: ${Math.min(100, prog.arrows_shot ?? 0)} / 100 arrows`;
    if (achId === 'ach_arrows_500')
      return `Progress: ${Math.min(500, prog.arrows_shot ?? 0)} / 500 arrows`;
    if (achId === 'ach_arrows_1000')
      return `Progress: ${Math.min(1000, prog.arrows_shot ?? 0)} / 1,000 arrows`;
    if (achId === 'ach_hits_100')
      return `Progress: ${Math.min(100, prog.hits ?? 0)} / 100 bullseyes`;
    if (achId === 'ach_hits_500')
      return `Progress: ${Math.min(500, prog.hits ?? 0)} / 500 bullseyes`;
    if (achId === 'ach_resilience_5')
      return `Progress: ${Math.min(5, prog.comeback_hits ?? 0)} / 5 comebacks`;
    if (achId === 'ach_resilience_15')
      return `Progress: ${Math.min(15, prog.comeback_hits ?? 0)} / 15 comebacks`;
    if (achId === 'ach_make_10_veteran')
      return `Progress: ${Math.min(10, prog.make10_count ?? 0)} / 10 Make-10`;
    if (achId === 'ach_doubles_expert')
      return `Progress: ${Math.min(10, prog.doubles_count ?? 0)} / 10 Doubles`;
    if (achId === 'ach_streak_return_5')
      return `Current Streak: ${Math.min(5, rewardsState.currentStreak)} / 5 days`;
    if (achId === 'ach_streak_return_7')
      return `Current Streak: ${Math.min(7, rewardsState.currentStreak)} / 7 days`;
    if (achId === 'ach_streak_return_14')
      return `Current Streak: ${Math.min(14, rewardsState.currentStreak)} / 14 days`;
    if (achId === 'ach_streak_return_30')
      return `Current Streak: ${Math.min(30, rewardsState.currentStreak)} / 30 days`;
    if (achId === 'ach_level_10') return `Current Level: ${Math.min(10, rewardsState.level)} / 10`;
    if (achId === 'ach_level_20') return `Current Level: ${Math.min(20, rewardsState.level)} / 20`;
    if (achId === 'ach_level_30') return `Current Level: ${Math.min(30, rewardsState.level)} / 30`;
    if (achId === 'ach_collector')
      return `Unlocked: ${Math.min(4, rewardsState.unlockedCosmeticIds.length)} / 4`;
    if (achId === 'ach_wardrobe_12')
      return `Unlocked: ${Math.min(12, rewardsState.unlockedCosmeticIds.length)} / 12`;
    if (achId === 'ach_wardrobe_25')
      return `Unlocked: ${Math.min(25, rewardsState.unlockedCosmeticIds.length)} / 25`;
    if (achId === 'ach_spells_50')
      return `Progress: ${Math.min(50, prog.spells_cast ?? 0)} / 50 spells`;
    if (achId === 'ach_dummy_hits_25')
      return `Progress: ${Math.min(25, prog.dummy_hits ?? 0)} / 25 dummy hits`;
    if (achId === 'ach_dummy_hits_100')
      return `Progress: ${Math.min(100, prog.dummy_hits ?? 0)} / 100 dummy hits`;
    return null;
  };

  const achievements = getAllAchievements();
  const tomorrow = rewardsState.tomorrowReward;

  return (
    <div className="rewards-screen" data-testid="rewards-screen">
      {/* Main Single-Screen Arena Layout (Left: Hero Stage & Stats; Right: Armory Vault) */}
      <div className="armory-arena-layout">
        {/* Left Column: Hero Showcase Stage & Kingdom Inspection */}
        <section className="hero-showcase-stage armory-stage-column" data-testid="rewards-showcase">
          <div className="stage-header">
            <div className="stage-header-title-group">
              {onBackToGame && (
                <button
                  type="button"
                  className="rewards-back-btn"
                  data-testid="btn-back-to-game"
                  onClick={onBackToGame}
                >
                  🏹 Back to Range
                </button>
              )}
              <div className="rewards-title-group">
                <h2>🏆 Royal Armory</h2>
              </div>
            </div>

            <div className="stage-header-controls">
              <div className="stage-switchers-row" data-testid="stage-switchers-row">
                <div
                  className="switcher-group character-switcher"
                  role="group"
                  aria-label="Hero Selection"
                >
                  <button
                    type="button"
                    className={`switcher-pill ${activeCharacter === 'archer' ? 'active' : ''}`}
                    data-testid="rewards-switch-archer"
                    onClick={() => handleSwitchCharacter('archer')}
                    title="Switch to Archer"
                  >
                    🏹 Archer
                  </button>
                  <button
                    type="button"
                    className={`switcher-pill ${activeCharacter === 'wizard' ? 'active' : ''}`}
                    data-testid="rewards-switch-wizard"
                    onClick={() => handleSwitchCharacter('wizard')}
                    title="Switch to Wizard"
                  >
                    🧙‍♂️ Wizard
                  </button>
                  {(['gunner', 'warrior'] as const).map((character) => (
                    <button
                      key={character}
                      type="button"
                      className={`switcher-pill ${activeCharacter === character ? 'active' : ''}`}
                      data-testid={`rewards-switch-${character}`}
                      onClick={() => handleSwitchCharacter(character)}
                      title={`Play as ${CHARACTER_PROFILES[character].name}`}
                    >
                      {CHARACTER_PROFILES[character].icon} {CHARACTER_PROFILES[character].name}
                    </button>
                  ))}
                </div>

                <div
                  className="switcher-group target-switcher"
                  role="group"
                  aria-label="Target Selection"
                >
                  <button
                    type="button"
                    className={`switcher-pill ${activeTarget === 'archery_target' ? 'active' : ''}`}
                    data-testid="rewards-switch-target"
                    onClick={() => handleSwitchTarget('archery_target')}
                    title="Switch to Archery Target"
                  >
                    🎯 Target
                  </button>
                  <button
                    type="button"
                    className={`switcher-pill ${activeTarget === 'dummy' ? 'active' : ''}`}
                    data-testid="rewards-switch-dummy"
                    onClick={() => handleSwitchTarget('dummy')}
                    title="Switch to Training Dummy"
                  >
                    🪵 Dummy
                  </button>
                </div>
              </div>

              {worldProgression.unlockedAreaIds.length > 1 ? (
                <div className="stage-realm-selector" data-testid="stage-realm-selector">
                  <span className="stage-realm-label">Realm:</span>
                  <select
                    value={inspectedAreaId}
                    onChange={(e) => setInspectedAreaId(e.target.value as WorldAreaId)}
                    className="stage-realm-select"
                    data-testid="stage-realm-select"
                    aria-label="Select realm to inspect"
                  >
                    {worldProgression.unlockedAreaIds.map((areaId) => {
                      const area = getWorldArea(areaId);
                      return (
                        <option key={areaId} value={areaId}>
                          {area ? `${area.icon} ${area.name}` : areaId}
                        </option>
                      );
                    })}
                  </select>
                </div>
              ) : (
                <span className="stage-realm-pill" data-testid="stage-realm-pill">
                  🏰 {getWorldArea(inspectedAreaId)?.name ?? 'Royal Castle Courtyard'}
                </span>
              )}
              <button
                type="button"
                className="stage-test-shot-btn"
                data-testid="btn-test-shot"
                onClick={handleTriggerTestShot}
                title={`Test ${hero.action.toLowerCase()} equipped ${hero.weapon.toLowerCase()} and ${hero.projectile} effect`}
              >
                {`${hero.icon} Test ${hero.action}`}
              </button>
            </div>
          </div>

          {/* Compressed Archer Stats & Level Progress Bar */}
          <div className="stage-stats-bar">
            <div className="stage-stats-info">
              <span className="stat-value" data-testid="player-level-badge">
                ⭐ Level {rewardsState.level} • {rewardsState.levelTitle}
              </span>
              <span className="stat-value streak-value" data-testid="streak-badge">
                🔥 {rewardsState.currentStreak} Days
              </span>
            </div>

            <div className="level-progress-container">
              <div className="level-progress-track">
                <div
                  className="level-progress-fill"
                  style={{ width: `${rewardsState.levelProgressPct}%` }}
                />
              </div>
              <span className="level-progress-text" data-testid="player-xp-text">
                {rewardsState.currentLevelXp} / {rewardsState.nextLevelXp} XP (
                {rewardsState.levelProgressPct}%) • {rewardsState.totalXp} XP
              </span>
            </div>
          </div>

          <div className="stage-viewport" data-testid="stage-viewport">
            <div className="stage-backdrop-wrapper">
              <RangeBackdrop
                areaId={inspectedAreaId}
                equippedBanner={rewardsState.equippedCosmetics.castleBanner}
                equippedStatue={rewardsState.equippedCosmetics.castleStatue}
                equippedGround={rewardsState.equippedCosmetics.castleGround}
                variant="arena"
              />
            </div>

            <div className="stage-arena-content">
              {/* Upper Area: Character & Target Preview */}
              <div className="stage-entities-row">
                <div
                  className="stage-archer-preview"
                  data-testid="stage-archer-preview"
                  onClick={handleTriggerTestShot}
                  title={`Click ${hero.name.toLowerCase()} to test ${hero.action.toLowerCase()}`}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') handleTriggerTestShot();
                  }}
                >
                  <CharacterGraphic
                    character={activeCharacter}
                    state={
                      testShotReloading ? 'reloading' : testShotReleased ? 'released' : 'drawing'
                    }
                    element="fire"
                    equippedOutfit={rewardsState.equippedCosmetics.outfit}
                    equippedBow={rewardsState.equippedCosmetics.bow}
                  />
                </div>

                <div
                  className="stage-target-preview"
                  data-testid="stage-target-preview"
                  onClick={handleTriggerTestShot}
                  title="Click target to test impact"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') handleTriggerTestShot();
                  }}
                >
                  <TargetGraphic
                    target={activeTarget}
                    character={activeCharacter}
                    expression={
                      activeTarget === 'dummy' ? '🪵 Practice Dummy' : '🎯 Royal Bullseye'
                    }
                    hitState={testShotActive ? 'hit' : 'idle'}
                    activeElement="fire"
                    equippedEffect={rewardsState.equippedCosmetics.arrowEffect}
                  />
                </div>
              </div>

              {/* Tomorrow's Bounty Card */}
              <section className="tomorrow-bounty-card" data-testid="tomorrow-bounty-card">
                <div className="bounty-left">
                  <div className="bounty-icon-box">{tomorrow.icon}</div>
                  <div className="bounty-details">
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

              {/* Lower Ground Area: Badges Below */}
              <div className="stage-equipped-badges" data-testid="stage-equipped-badges">
                <button
                  type="button"
                  className="equipped-badge-chip"
                  data-testid="badge-equipped-outfit"
                  onClick={() => setActiveCategory('outfit')}
                  title="Equipped Outfit (Click to browse outfits)"
                >
                  <span className="chip-icon">🧥</span>
                  <span className="chip-text">{outfitItem?.name ?? 'Classic Tunic'}</span>
                </button>
                <button
                  type="button"
                  className="equipped-badge-chip"
                  data-testid="badge-equipped-bow"
                  onClick={() => setActiveCategory('bow')}
                  title={`Equipped ${hero.weapon} (Click to browse)`}
                >
                  <span className="chip-icon">
                    {bowItem ? getCharacterCosmetic(bowItem, activeCharacter).icon : hero.icon}
                  </span>
                  <span className="chip-text">
                    {bowItem ? getCharacterCosmetic(bowItem, activeCharacter).name : hero.weapon}
                  </span>
                </button>
                <button
                  type="button"
                  className="equipped-badge-chip"
                  data-testid="badge-equipped-effect"
                  onClick={() => setActiveCategory('arrow_effect')}
                  title={`Equipped ${hero.projectile} effect (Click to browse effects)`}
                >
                  <span className="chip-icon">{effectItem?.icon ?? '🎯'}</span>
                  <span className="chip-text">
                    {effectItem
                      ? getCharacterCosmetic(effectItem, activeCharacter).name
                      : `Classic ${hero.projectile}`}
                  </span>
                </button>
                <button
                  type="button"
                  className="equipped-badge-chip"
                  data-testid="badge-equipped-banner"
                  onClick={() => setActiveCategory('castle_decoration')}
                  title="Equipped Realm Banner (Click to browse realm decor)"
                >
                  <span className="chip-icon">🚩</span>
                  <span className="chip-text">{bannerItem?.name ?? 'Royal Banner'}</span>
                </button>
                <button
                  type="button"
                  className="equipped-badge-chip"
                  data-testid="badge-equipped-statue"
                  onClick={() => setActiveCategory('castle_decoration')}
                  title="Equipped Realm Statue (Click to browse realm decor)"
                >
                  <span className="chip-icon">🗿</span>
                  <span className="chip-text">{statueItem?.name ?? 'Royal Monument'}</span>
                </button>
                <button
                  type="button"
                  className="equipped-badge-chip"
                  data-testid="badge-equipped-ground"
                  onClick={() => setActiveCategory('castle_decoration')}
                  title="Equipped Realm Ground (Click to browse realm decor)"
                >
                  <span className="chip-icon">🌿</span>
                  <span className="chip-text">{groundItem?.name ?? 'Courtyard Pavers'}</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Right Column: Armory Vault & Customization Panel */}
        <section className="armory-catalog-column">
          {/* Category Navigation Tabs */}
          <nav className="rewards-tabs-nav" data-testid="armory-category-nav">
            <button
              type="button"
              className={`rewards-tab-btn ${activeCategory === 'outfit' ? 'active' : ''}`}
              data-testid="tab-cat-outfit"
              onClick={() => setActiveCategory('outfit')}
            >
              🧥 Outfits
            </button>
            <button
              type="button"
              className={`rewards-tab-btn ${activeCategory === 'bow' ? 'active' : ''}`}
              data-testid="tab-cat-bow"
              onClick={() => setActiveCategory('bow')}
            >
              {`${hero.icon} ${hero.weapons}`}
            </button>
            <button
              type="button"
              className={`rewards-tab-btn ${activeCategory === 'arrow_effect' ? 'active' : ''}`}
              data-testid="tab-cat-effects"
              onClick={() => setActiveCategory('arrow_effect')}
            >
              {`✨ ${hero.effects}`}
            </button>
            <button
              type="button"
              className={`rewards-tab-btn ${activeCategory === 'castle_decoration' ? 'active' : ''}`}
              data-testid="tab-cat-castle"
              onClick={() => setActiveCategory('castle_decoration')}
            >
              🏰 Realm Decorations
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
                const {
                  name: itemName,
                  icon: itemIcon,
                  description: itemDesc,
                } = getCharacterCosmetic(item, activeCharacter);

                return (
                  <div
                    key={item.id}
                    className={`cosmetic-card ${equipped ? 'is-equipped' : ''} ${
                      !unlocked ? 'is-locked' : ''
                    }`}
                    data-testid={`cosmetic-card-${item.id}`}
                  >
                    <div className="card-top">
                      <div className="cosmetic-icon-circle">{itemIcon}</div>
                      <div className="cosmetic-meta">
                        <span className={`cosmetic-rarity-chip rarity-${item.rarity}`}>
                          {item.rarity}
                        </span>
                        <h4 className="cosmetic-name">{itemName}</h4>
                        <p className="cosmetic-desc">{itemDesc}</p>
                      </div>
                    </div>

                    {item.category === 'arrow_effect' && (
                      <div
                        className="arrow-effect-card-preview"
                        data-testid={`arrow-preview-${item.id}`}
                        onClick={() => {
                          if (equipped) {
                            handleTriggerTestShot();
                          }
                        }}
                        title={equipped ? 'Click to test fire this effect' : undefined}
                      >
                        <ElementalArrowGraphic
                          element="fire"
                          variant="quiver"
                          equippedEffect={item.id}
                          character={activeCharacter}
                        />
                      </div>
                    )}

                    <div className="card-bottom">
                      <div className="card-status-badge">
                        {equipped ? (
                          <span
                            className="badge-equipped"
                            data-testid={`status-equipped-${item.id}`}
                          >
                            ✅ Equipped
                          </span>
                        ) : unlocked ? (
                          <span style={{ color: '#2563eb', fontWeight: 600, fontSize: 11 }}>
                            Unlocked
                          </span>
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
                {/* Category Filter Pills */}
                <div className="trophy-filters-bar" data-testid="trophy-filters">
                  {(
                    [
                      { id: 'all', label: 'All' },
                      { id: 'consistency', label: 'Streaks' },
                      { id: 'mastery', label: 'Mastery' },
                      { id: 'resilience', label: 'Resilience' },
                      { id: 'milestone', label: 'Ranks' },
                      { id: 'exploration', label: 'Exploration' },
                      { id: 'collection', label: 'Armory' },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      className={`trophy-filter-btn ${trophyFilter === tab.id ? 'active' : ''}`}
                      data-testid={`trophy-filter-${tab.id}`}
                      onClick={() => setTrophyFilter(tab.id)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="achievements-grid">
                {achievements
                  .filter((ach) => trophyFilter === 'all' || ach.category === trophyFilter)
                  .map((ach) => {
                    const isAchUnlocked = rewardsState.unlockedAchievementIds.includes(ach.id);
                    const progressText = !isAchUnlocked ? getAchievementProgressText(ach.id) : null;

                    return (
                      <div
                        key={ach.id}
                        className={`achievement-card ${isAchUnlocked ? 'is-unlocked' : 'is-locked'}`}
                        data-testid={`ach-card-${ach.id}`}
                      >
                        <div className="ach-icon-box">{ach.icon}</div>
                        <div className="ach-info">
                          <div className="ach-title-row">
                            <h4>{ach.title}</h4>
                            <span className="ach-category-tag">{ach.category}</span>
                          </div>
                          <p>{ach.description}</p>
                          <div className="ach-card-footer">
                            <span className="ach-reward-chip">
                              {isAchUnlocked
                                ? `⭐ Claimed +${ach.xpReward} XP`
                                : `+${ach.xpReward} XP Reward`}
                            </span>
                            {progressText && (
                              <span
                                className="ach-progress-chip"
                                data-testid={`ach-progress-${ach.id}`}
                              >
                                {progressText}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
