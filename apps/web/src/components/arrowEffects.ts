export interface ArrowEffectVisual {
  id: string;
  name: string;
  icon: string;
  impactGlyphs: string;
  primaryColor: string;
  secondaryColor: string;
  glowColor: string;
  particleType:
    | 'spark'
    | 'star'
    | 'ember'
    | 'rainbow'
    | 'lightning'
    | 'void'
    | 'sunbeam'
    | 'petal'
    | 'ice'
    | 'dragon'
    | 'meteor'
    | 'phoenix'
    | 'supernova';
  summary: string;
}

export const ARROW_EFFECT_VISUALS: Record<string, ArrowEffectVisual> = {
  arrow_effect_classic: {
    id: 'arrow_effect_classic',
    name: 'Classic Fletch Spark',
    icon: '🎯',
    impactGlyphs: '✨🎯✨',
    primaryColor: '#f59e0b',
    secondaryColor: '#d97706',
    glowColor: '#fbbf24',
    particleType: 'spark',
    summary: 'Golden wooden friction sparks and a crisp whistling trajectory.',
  },
  arrow_effect_stardust: {
    id: 'arrow_effect_stardust',
    name: 'Twinkling Stardust',
    icon: '✨',
    impactGlyphs: '✨💎✨',
    primaryColor: '#818cf8',
    secondaryColor: '#a5b4fc',
    glowColor: '#c7d2fe',
    particleType: 'star',
    summary: 'Glittering astral starlight trails with diamond glint dispersion.',
  },
  arrow_effect_sparkle_nova: {
    id: 'arrow_effect_sparkle_nova',
    name: 'Sparkle Nova Burst',
    icon: '🌟',
    impactGlyphs: '🌟💫🌟',
    primaryColor: '#ec4899',
    secondaryColor: '#db2777',
    glowColor: '#fbcfe8',
    particleType: 'supernova',
    summary: 'Radiant celestial nova pulses blooming across the target face.',
  },
  arrow_effect_flame_embers: {
    id: 'arrow_effect_flame_embers',
    name: 'Blazing Embers Trail',
    icon: '🔥',
    impactGlyphs: '🔥💥🔥',
    primaryColor: '#f97316',
    secondaryColor: '#ea580c',
    glowColor: '#fed7aa',
    particleType: 'ember',
    summary: 'Smoking heat plume with a shower of glowing hot sparks.',
  },
  arrow_effect_rainbow: {
    id: 'arrow_effect_rainbow',
    name: 'Rainbow Aurora Glimmer',
    icon: '🌈',
    impactGlyphs: '🌈✨🌈',
    primaryColor: '#a855f7',
    secondaryColor: '#ec4899',
    glowColor: '#38bdf8',
    particleType: 'rainbow',
    summary: 'Prismatic aurora arc shimmering across shifting twilight colors.',
  },
  arrow_effect_thunder_strike: {
    id: 'arrow_effect_thunder_strike',
    name: 'Thunderbolt Flash',
    icon: '⚡',
    impactGlyphs: '⚡⚡⚡',
    primaryColor: '#0ea5e9',
    secondaryColor: '#0284c7',
    glowColor: '#7dd3fc',
    particleType: 'lightning',
    summary: 'Electric blue lightning arcs dancing along the shaft with a thunder snap.',
  },
  arrow_effect_shadow_void: {
    id: 'arrow_effect_shadow_void',
    name: 'Void Mist Spiral',
    icon: '🌌',
    impactGlyphs: '🌌🌀🌌',
    primaryColor: '#7c3aed',
    secondaryColor: '#4c1d95',
    glowColor: '#c4b5fd',
    particleType: 'void',
    summary: 'Astral dark matter mist corkscrewing along the arrow wake.',
  },
  arrow_effect_golden_sunbeam: {
    id: 'arrow_effect_golden_sunbeam',
    name: 'Solar Sunbeam Ray',
    icon: '☀️',
    impactGlyphs: '☀️✨☀️',
    primaryColor: '#eab308',
    secondaryColor: '#ca8a04',
    glowColor: '#fef08a',
    particleType: 'sunbeam',
    summary: 'Dazzling golden sunbeam flares radiating outward in flight.',
  },
  arrow_effect_sakura_petals: {
    id: 'arrow_effect_sakura_petals',
    name: 'Sakura Blossom Breeze',
    icon: '🌸',
    impactGlyphs: '🌸🍃🌸',
    primaryColor: '#f472b6',
    secondaryColor: '#fb7185',
    glowColor: '#fce7f3',
    particleType: 'petal',
    summary: 'Delicate pink cherry blossom petals fluttering gracefully.',
  },
  arrow_effect_ice_shards: {
    id: 'arrow_effect_ice_shards',
    name: 'Glacial Needle Storm',
    icon: '❄️',
    impactGlyphs: '❄️💎❄️',
    primaryColor: '#38bdf8',
    secondaryColor: '#0284c7',
    glowColor: '#e0f2fe',
    particleType: 'ice',
    summary: 'Crystalline ice needles flaking off the shaft and shattering upon impact.',
  },
  arrow_effect_dragon_fire: {
    id: 'arrow_effect_dragon_fire',
    name: 'Draconic Flame Vortex',
    icon: '🐲',
    impactGlyphs: '🐲🔥🐲',
    primaryColor: '#dc2626',
    secondaryColor: '#991b1b',
    glowColor: '#f97316',
    particleType: 'dragon',
    summary: 'Spiraling crimson dragon fire tendrils engulfing the arrow path.',
  },
  arrow_effect_comet_trail: {
    id: 'arrow_effect_comet_trail',
    name: 'Starfall Meteor Trail',
    icon: '☄️',
    impactGlyphs: '☄️💫☄️',
    primaryColor: '#06b6d4',
    secondaryColor: '#0891b2',
    glowColor: '#a5f3fc',
    particleType: 'meteor',
    summary: 'White-hot cyan meteor core sweeping a glittering stardust tail.',
  },
  arrow_effect_phoenix_sparks: {
    id: 'arrow_effect_phoenix_sparks',
    name: 'Phoenix Rebirth Radiance',
    icon: '🪶',
    impactGlyphs: '🪶🔥🪶',
    primaryColor: '#f59e0b',
    secondaryColor: '#b45309',
    glowColor: '#ef4444',
    particleType: 'phoenix',
    summary: 'Ascending golden and ruby phoenix sparks accompanied by harmonic celestial tones.',
  },
  arrow_effect_celestial_supernova: {
    id: 'arrow_effect_celestial_supernova',
    name: 'Prismatic Supernova',
    icon: '💫',
    impactGlyphs: '💫🌟💫',
    primaryColor: '#ec4899',
    secondaryColor: '#8b5cf6',
    glowColor: '#38bdf8',
    particleType: 'supernova',
    summary: 'Full-spectrum cosmic ripple shockwave radiating across the courtyard.',
  },
};

export const DEFAULT_ARROW_EFFECT = ARROW_EFFECT_VISUALS.arrow_effect_classic;

export function getArrowEffectVisual(effectId?: string | null): ArrowEffectVisual {
  if (!effectId) return DEFAULT_ARROW_EFFECT;
  return ARROW_EFFECT_VISUALS[effectId] || DEFAULT_ARROW_EFFECT;
}
