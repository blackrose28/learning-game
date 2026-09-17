import type {
  CosmeticItem,
  Achievement,
  EquippedCosmetics,
  TomorrowRewardPreview,
} from './types';

export interface LevelThreshold {
  level: number;
  xpRequired: number;
  title: string;
}

export const LEVEL_THRESHOLDS: readonly LevelThreshold[] = [
  { level: 1, xpRequired: 0, title: 'Novice Archer' },
  { level: 2, xpRequired: 120, title: 'Apprentice Bowman' },
  { level: 3, xpRequired: 300, title: 'Ranger Scout' },
  { level: 4, xpRequired: 550, title: 'Master Fletcher' },
  { level: 5, xpRequired: 900, title: 'Royal Marksman' },
  { level: 6, xpRequired: 1400, title: 'Grand Champion' },
  { level: 7, xpRequired: 2000, title: 'Legendary Sharpshooter' },
];

export const DEFAULT_EQUIPPED: EquippedCosmetics = {
  outfit: 'outfit_classic_green',
  bow: 'bow_recurve_oak',
  arrowEffect: 'arrow_effect_classic',
  castleBanner: 'castle_banner_royal_lion',
  castleStatue: 'castle_statue_none',
  castleGround: 'castle_ground_classic_lawn',
};

export const COSMETIC_ITEMS: readonly CosmeticItem[] = [
  // --- OUTFITS ---
  {
    id: 'outfit_classic_green',
    name: 'Forest Ranger Tunic',
    category: 'outfit',
    description: 'The traditional emerald hood and tunic worn by kingdom scouts in Sherwood glades.',
    icon: '🏹',
    rarity: 'common',
    unlockType: 'default',
    unlockThreshold: 0,
    unlockDescription: 'Unlocked by default',
    preview: {
      primaryColor: '#15803d',
      secondaryColor: '#14532d',
      accentColor: '#ef4444',
    },
  },
  {
    id: 'outfit_ember_crimson',
    name: 'Ember Hearth Robe',
    category: 'outfit',
    description: 'Woven with fire-retardant threads and warm ember lining from the Fire Village.',
    icon: '🔥',
    rarity: 'rare',
    unlockType: 'xp_level',
    unlockThreshold: 2,
    unlockDescription: 'Reach Level 2 (Apprentice Bowman)',
    preview: {
      primaryColor: '#dc2626',
      secondaryColor: '#991b1b',
      accentColor: '#f59e0b',
    },
  },
  {
    id: 'outfit_frost_azure',
    name: 'Glacial Frost Cloak',
    category: 'outfit',
    description: 'An insulated azure cloak decorated with crystalline ice feathers that catch the light.',
    icon: '❄️',
    rarity: 'rare',
    unlockType: 'streak_days',
    unlockThreshold: 2,
    unlockDescription: 'Complete sessions 2 days in a row (2-Day Streak)',
    preview: {
      primaryColor: '#0284c7',
      secondaryColor: '#0369a1',
      accentColor: '#38bdf8',
    },
  },
  {
    id: 'outfit_zephyr_emerald',
    name: 'Zephyr Wind Mantle',
    category: 'outfit',
    description: 'Aerodynamic mantle crafted for high winds and mountain plateaus.',
    icon: '💨',
    rarity: 'epic',
    unlockType: 'xp_level',
    unlockThreshold: 4,
    unlockDescription: 'Reach Level 4 (Master Fletcher)',
    preview: {
      primaryColor: '#059669',
      secondaryColor: '#065f46',
      accentColor: '#34d399',
    },
  },
  {
    id: 'outfit_royal_gold',
    name: "Champion's Royal Cowl",
    category: 'outfit',
    description: 'A shimmering royal gold cowl awarded only to marksmen of extraordinary dedication.',
    icon: '👑',
    rarity: 'legendary',
    unlockType: 'xp_level',
    unlockThreshold: 5,
    unlockDescription: 'Reach Level 5 (Royal Marksman)',
    preview: {
      primaryColor: '#d97706',
      secondaryColor: '#b45309',
      accentColor: '#fbbf24',
    },
  },

  // --- BOWS ---
  {
    id: 'bow_recurve_oak',
    name: 'Apprentice Recurve',
    category: 'bow',
    description: 'Hand-carved curved laminated oak limbs with supple deerhide riser grip.',
    icon: '🪵',
    rarity: 'common',
    unlockType: 'default',
    unlockThreshold: 0,
    unlockDescription: 'Unlocked by default',
    preview: {
      primaryColor: '#92400e',
      secondaryColor: '#78350f',
      accentColor: '#f59e0b',
    },
  },
  {
    id: 'bow_ember_blaze',
    name: 'Sunfire Ember Bow',
    category: 'bow',
    description: 'Charred ashwood limbs etched with glowing magma runes that radiate steady warmth.',
    icon: '🔥',
    rarity: 'rare',
    unlockType: 'sessions_count',
    unlockThreshold: 1,
    unlockDescription: 'Complete 1 full daily session',
    preview: {
      primaryColor: '#ea580c',
      secondaryColor: '#7c2d12',
      accentColor: '#fdba74',
    },
  },
  {
    id: 'bow_frost_crystal',
    name: 'Crystalline Longbow',
    category: 'bow',
    description: 'Carved from perennial glacier crystal that hums with crisp harmonic resonance.',
    icon: '❄️',
    rarity: 'rare',
    unlockType: 'xp_level',
    unlockThreshold: 3,
    unlockDescription: 'Reach Level 3 (Ranger Scout)',
    preview: {
      primaryColor: '#38bdf8',
      secondaryColor: '#0284c7',
      accentColor: '#e0f2fe',
    },
  },
  {
    id: 'bow_zephyr_wind',
    name: 'Whispering Gale Bow',
    category: 'bow',
    description: 'Reinforced light bamboo flexed by mountain zephyrs for swift string release.',
    icon: '💨',
    rarity: 'epic',
    unlockType: 'sessions_count',
    unlockThreshold: 3,
    unlockDescription: 'Complete 3 daily sessions',
    preview: {
      primaryColor: '#10b981',
      secondaryColor: '#047857',
      accentColor: '#a7f3d0',
    },
  },
  {
    id: 'bow_regal_gold',
    name: 'Golden Sovereign Bow',
    category: 'bow',
    description: 'Gilded with refined royal aurum and inlaid with sparkling sapphire arrow nocks.',
    icon: '✨',
    rarity: 'legendary',
    unlockType: 'xp_level',
    unlockThreshold: 5,
    unlockDescription: 'Reach Level 5 (Royal Marksman)',
    preview: {
      primaryColor: '#eab308',
      secondaryColor: '#a16207',
      accentColor: '#fef08a',
    },
  },

  // --- ARROW EFFECTS ---
  {
    id: 'arrow_effect_classic',
    name: 'Classic Fletch Spark',
    category: 'arrow_effect',
    description: 'Clean whistling trajectory with brief wooden impact sparks.',
    icon: '🎯',
    rarity: 'common',
    unlockType: 'default',
    unlockThreshold: 0,
    unlockDescription: 'Unlocked by default',
    preview: {
      primaryColor: '#f59e0b',
      glowColor: '#fbbf24',
    },
  },
  {
    id: 'arrow_effect_stardust',
    name: 'Twinkling Stardust',
    category: 'arrow_effect',
    description: 'Arrows trail glittering starlight and disperse diamond sparkles on impact.',
    icon: '✨',
    rarity: 'rare',
    unlockType: 'sessions_count',
    unlockThreshold: 1,
    unlockDescription: 'Complete 1 full daily session',
    preview: {
      primaryColor: '#818cf8',
      glowColor: '#c7d2fe',
    },
  },
  {
    id: 'arrow_effect_sparkle_nova',
    name: 'Sparkle Nova Burst',
    category: 'arrow_effect',
    description: 'Fires with brilliant celestial nova ripples that bloom when striking the bullseye.',
    icon: '🌟',
    rarity: 'epic',
    unlockType: 'streak_days',
    unlockThreshold: 3,
    unlockDescription: 'Complete sessions 3 days in a row (3-Day Streak)',
    preview: {
      primaryColor: '#ec4899',
      glowColor: '#fbcfe8',
    },
  },
  {
    id: 'arrow_effect_flame_embers',
    name: 'Blazing Embers Trail',
    category: 'arrow_effect',
    description: 'Leaves a smoking heat plume and showers embers over the target face.',
    icon: '🔥',
    rarity: 'rare',
    unlockType: 'xp_level',
    unlockThreshold: 2,
    unlockDescription: 'Reach Level 2 (Apprentice Bowman)',
    preview: {
      primaryColor: '#f97316',
      glowColor: '#fed7aa',
    },
  },
  {
    id: 'arrow_effect_rainbow',
    name: 'Rainbow Aurora Glimmer',
    category: 'arrow_effect',
    description: 'A magical prismatic arc that paints the sky in shifting twilight hues.',
    icon: '🌈',
    rarity: 'legendary',
    unlockType: 'xp_level',
    unlockThreshold: 4,
    unlockDescription: 'Reach Level 4 (Master Fletcher)',
    preview: {
      primaryColor: '#a855f7',
      glowColor: '#38bdf8',
    },
  },

  // --- CASTLE DECORATIONS ---
  {
    id: 'castle_banner_royal_lion',
    name: 'Royal Lion Pennants',
    category: 'castle_decoration',
    description: 'Noble blue and crimson heraldic banners flying proudly along the battlements.',
    icon: '🚩',
    rarity: 'common',
    unlockType: 'default',
    unlockThreshold: 0,
    unlockDescription: 'Unlocked by default',
    preview: {
      primaryColor: '#2563eb',
      secondaryColor: '#dc2626',
    },
  },
  {
    id: 'castle_banner_dragon_fire',
    name: 'Dragon Flame Pennants',
    category: 'castle_decoration',
    description: 'Blazing orange banners emblazoned with the Fire Village dragon crest.',
    icon: '🐉',
    rarity: 'rare',
    unlockType: 'sessions_count',
    unlockThreshold: 2,
    unlockDescription: 'Complete 2 daily sessions',
    preview: {
      primaryColor: '#ea580c',
      secondaryColor: '#facc15',
    },
  },
  {
    id: 'castle_banner_pegasus',
    name: 'Silver Pegasus Banners',
    category: 'castle_decoration',
    description: 'Airborne winged steed tapestries fluttering in the sky zephyrs.',
    icon: '🦄',
    rarity: 'epic',
    unlockType: 'streak_days',
    unlockThreshold: 2,
    unlockDescription: 'Complete sessions 2 days in a row (2-Day Streak)',
    preview: {
      primaryColor: '#6366f1',
      secondaryColor: '#e0e7ff',
    },
  },
  {
    id: 'castle_statue_none',
    name: 'Clear Parapets',
    category: 'castle_decoration',
    description: 'Open stone parapets overlooking the courtyard.',
    icon: '🏰',
    rarity: 'common',
    unlockType: 'default',
    unlockThreshold: 0,
    unlockDescription: 'Unlocked by default',
    preview: {
      primaryColor: '#94a3b8',
    },
  },
  {
    id: 'castle_statue_stone_gargoyle',
    name: 'Guardian Stone Gargoyles',
    category: 'castle_decoration',
    description: 'Carved stone sentinels perched vigilantly atop the castle towers.',
    icon: '🗿',
    rarity: 'rare',
    unlockType: 'xp_level',
    unlockThreshold: 3,
    unlockDescription: 'Reach Level 3 (Ranger Scout)',
    preview: {
      primaryColor: '#475569',
      secondaryColor: '#64748b',
    },
  },
  {
    id: 'castle_statue_golden_archer',
    name: 'Hero Archer Statue',
    category: 'castle_decoration',
    description: 'A grand gilded monument commemorating the kingdom’s greatest champion.',
    icon: '🏆',
    rarity: 'legendary',
    unlockType: 'xp_level',
    unlockThreshold: 5,
    unlockDescription: 'Reach Level 5 (Royal Marksman)',
    preview: {
      primaryColor: '#fbbf24',
      secondaryColor: '#d97706',
    },
  },
  {
    id: 'castle_ground_classic_lawn',
    name: 'Courtyard Lawn',
    category: 'castle_decoration',
    description: 'Lush green grass trimmed for daily target practice.',
    icon: '🌱',
    rarity: 'common',
    unlockType: 'default',
    unlockThreshold: 0,
    unlockDescription: 'Unlocked by default',
    preview: {
      primaryColor: '#22c55e',
    },
  },
  {
    id: 'castle_ground_flowerbed',
    name: 'Royal Rose Garden',
    category: 'castle_decoration',
    description: 'Fragrant crimson rose bushes and manicured topiaries lining the shooting range.',
    icon: '🌹',
    rarity: 'rare',
    unlockType: 'sessions_count',
    unlockThreshold: 3,
    unlockDescription: 'Complete 3 daily sessions',
    preview: {
      primaryColor: '#e11d48',
      secondaryColor: '#16a34a',
    },
  },
  {
    id: 'castle_ground_champions_pedestal',
    name: "Champion's Plinth",
    category: 'castle_decoration',
    description: 'Inscribed stone tournament plinth displaying golden target wreaths.',
    icon: '🏛️',
    rarity: 'epic',
    unlockType: 'achievement',
    unlockThreshold: 'ach_daily_champion',
    unlockDescription: 'Earn the "Daily Archer" Achievement',
    preview: {
      primaryColor: '#e2e8f0',
      secondaryColor: '#f59e0b',
    },
  },
];

export const ACHIEVEMENTS: readonly Achievement[] = [
  {
    id: 'ach_first_arrow',
    title: 'First Flight',
    description: 'Release your very first arrow towards the target.',
    icon: '🏹',
    xpReward: 25,
    badgeColor: '#3b82f6',
    category: 'exploration',
  },
  {
    id: 'ach_daily_champion',
    title: 'Daily Archer',
    description: 'Complete all 50 arrows in a single daily session.',
    icon: '🎯',
    xpReward: 100,
    badgeColor: '#10b981',
    category: 'consistency',
  },
  {
    id: 'ach_streak_return_2',
    title: 'Loyal Ranger',
    description: 'Return and complete sessions 2 days in a row.',
    icon: '🔥',
    xpReward: 120,
    badgeColor: '#f97316',
    category: 'consistency',
  },
  {
    id: 'ach_streak_return_3',
    title: 'Kingdom Champion',
    description: 'Return and complete sessions 3 days in a row.',
    icon: '👑',
    xpReward: 200,
    badgeColor: '#eab308',
    category: 'consistency',
  },
  {
    id: 'ach_resilience',
    title: 'Grit & Determination',
    description: 'Hit the target on your next try after missing an arrow.',
    icon: '💪',
    xpReward: 40,
    badgeColor: '#8b5cf6',
    category: 'resilience',
  },
  {
    id: 'ach_elements_all',
    title: 'Elemental Adept',
    description: 'Shoot Fire, Ice, Wind, and Earth arrows in your practice.',
    icon: '✨',
    xpReward: 50,
    badgeColor: '#06b6d4',
    category: 'mastery',
  },
  {
    id: 'ach_streak_5',
    title: 'Bullseye Focus',
    description: 'Hit 5 consecutive targets without missing.',
    icon: '🌟',
    xpReward: 50,
    badgeColor: '#ec4899',
    category: 'mastery',
  },
  {
    id: 'ach_realm_explorer',
    title: 'Realm Wanderer',
    description: 'Unlock your first new realm on the World Map.',
    icon: '🗺️',
    xpReward: 75,
    badgeColor: '#14b8a6',
    category: 'exploration',
  },
  {
    id: 'ach_make_10_master',
    title: 'Ten-Maker',
    description: 'Solve a question that uses Make-10 decomposition strategy.',
    icon: '🔟',
    xpReward: 45,
    badgeColor: '#6366f1',
    category: 'mastery',
  },
  {
    id: 'ach_collector',
    title: 'Royal Wardrobe',
    description: 'Unlock at least 4 custom cosmetics or castle decorations.',
    icon: '💎',
    xpReward: 60,
    badgeColor: '#a855f7',
    category: 'collection',
  },
];

export const COSMETIC_BY_ID = new Map<string, CosmeticItem>(
  COSMETIC_ITEMS.map((item) => [item.id, item])
);

export const ACHIEVEMENT_BY_ID = new Map<string, Achievement>(
  ACHIEVEMENTS.map((ach) => [ach.id, ach])
);

export function getCosmeticItem(id: string): CosmeticItem | undefined {
  return COSMETIC_BY_ID.get(id);
}

export function getAchievement(id: string): Achievement | undefined {
  return ACHIEVEMENT_BY_ID.get(id);
}

export function getAllCosmetics(): readonly CosmeticItem[] {
  return COSMETIC_ITEMS;
}

export function getAllAchievements(): readonly Achievement[] {
  return ACHIEVEMENTS;
}

export function getCosmeticsByCategory(category: CosmeticItem['category']): CosmeticItem[] {
  return COSMETIC_ITEMS.filter((item) => item.category === category);
}

export function getDefaultTomorrowReward(currentStreak: number = 0): TomorrowRewardPreview {
  if (currentStreak === 0) {
    return {
      type: 'streak_bonus',
      title: 'First Return Bonus',
      description: 'Return tomorrow to start your 2-Day Streak and claim +25 Streak Bonus XP!',
      icon: '🔥',
      reasonToReturn: 'Tomorrow begins your consecutive practice streak!',
      unlockCondition: 'Practice tomorrow to ignite your streak',
    };
  }

  if (currentStreak === 1) {
    return {
      type: 'cosmetic',
      title: 'Glacial Frost Cloak & Silver Pegasus Banners',
      description: 'Complete your 2nd daily session tomorrow to unlock rare Azure gear!',
      icon: '❄️',
      reasonToReturn: 'Return tomorrow for your 2-Day Streak to unlock rare winter gear.',
      unlockCondition: 'Complete 1 session tomorrow (2-Day Streak)',
    };
  }

  if (currentStreak === 2) {
    return {
      type: 'cosmetic',
      title: 'Sparkle Nova Burst & Kingdom Champion Badge',
      description: 'A 3-Day streak unlocks the legendary Sparkle Nova arrow effect and +200 XP!',
      icon: '🌟',
      reasonToReturn: 'Reach the prestigious 3-Day Streak milestone tomorrow!',
      unlockCondition: 'Complete 1 session tomorrow (3-Day Streak)',
    };
  }

  return {
    type: 'streak_bonus',
    title: `${currentStreak + 1}-Day Streak Champion Bonus`,
    description: `Return tomorrow to maintain your ${currentStreak + 1}-day streak and claim +50 Bonus XP!`,
    icon: '👑',
    reasonToReturn: `Keep your heroic ${currentStreak}-day streak alive tomorrow!`,
    unlockCondition: 'Practice tomorrow to protect your streak',
  };
}

