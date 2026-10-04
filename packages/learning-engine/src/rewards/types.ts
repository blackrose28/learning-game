/**
 * Categories of cosmetics available in the Royal Armory.
 * Note: 'castle_decoration' represents Realm Decorations (heraldic banners, monuments/statues, and range ground),
 * which customize the archer's tournament encampment across all world realms.
 */
export type CosmeticCategory = 'outfit' | 'bow' | 'arrow_effect' | 'castle_decoration';

export type RealmDecorationSlot = 'banner' | 'statue' | 'ground';

export type CosmeticRarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';

export type UnlockType = 'default' | 'xp_level' | 'sessions_count' | 'streak_days' | 'achievement';

export interface CosmeticPreviewStyle {
  primaryColor: string;
  secondaryColor?: string;
  accentColor?: string;
  gradient?: string;
  glowColor?: string;
  particleType?: string;
}

export type CharacterType = 'archer' | 'wizard' | 'gunner' | 'warrior';

export type TargetType = 'archery_target' | 'dummy';

export interface CosmeticItem {
  id: string;
  name: string;
  category: CosmeticCategory;
  description: string;
  icon: string;
  rarity: CosmeticRarity;
  unlockType: UnlockType;
  unlockThreshold: number | string;
  unlockDescription: string;
  preview: CosmeticPreviewStyle;
  wizardWeaponName?: string;
  wizardWeaponDesc?: string;
  wizardWeaponIcon?: string;
}

export type AchievementCategory =
  'exploration' | 'consistency' | 'resilience' | 'mastery' | 'collection' | 'milestone';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  xpReward: number;
  badgeColor: string;
  category: AchievementCategory;
}

export interface EquippedCosmetics {
  character?: CharacterType;
  target?: TargetType;
  outfit: string;
  bow: string;
  arrowEffect: string;
  /** Realm banner standard (persisted as castleBanner for backwards compatibility) */
  castleBanner: string;
  /** Realm monument / statue (persisted as castleStatue for backwards compatibility) */
  castleStatue: string;
  /** Realm shooting ground / pavilion pavers (persisted as castleGround for backwards compatibility) */
  castleGround: string;
}

export interface TomorrowRewardPreview {
  type: 'streak_bonus' | 'cosmetic' | 'level_unlock' | 'quest';
  title: string;
  description: string;
  icon: string;
  reasonToReturn: string;
  unlockCondition: string;
}

export interface PlayerRewardsState {
  playerId: string;
  totalXp: number;
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  levelProgressPct: number;
  levelTitle: string;
  currentStreak: number;
  bestStreak: number;
  lastActiveDate: string | null;
  unlockedCosmeticIds: string[];
  equippedCosmetics: EquippedCosmetics;
  unlockedAchievementIds: string[];
  achievementProgress: Record<string, number>;
  tomorrowReward: TomorrowRewardPreview;
  updatedAt?: string;
}

export interface XpAward {
  amount: number;
  reason: 'attempt' | 'hit' | 'resilience' | 'session_complete' | 'streak_bonus' | 'achievement';
  message: string;
}

export interface AttemptRewardResult {
  nextState: PlayerRewardsState;
  xpAwarded: number;
  xpAwards: XpAward[];
  newAchievements: Achievement[];
  newCosmetics: CosmeticItem[];
  levelUp: { oldLevel: number; newLevel: number; newTitle: string } | null;
}

export interface SessionCompletionRewardResult {
  nextState: PlayerRewardsState;
  xpAwarded: number;
  xpAwards: XpAward[];
  newAchievements: Achievement[];
  newCosmetics: CosmeticItem[];
  levelUp: { oldLevel: number; newLevel: number; newTitle: string } | null;
  tomorrowReward: TomorrowRewardPreview;
}
